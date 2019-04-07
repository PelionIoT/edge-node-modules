'use strict';
/*
 * Copyright (c) 2018, Arm Limited and affiliates.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const led = require('./led');
const jsonminify = require('jsonminify');
const fs = require('fs');
const os = require('os');
const request = require('request');

var options = {};

function getIPV4Address() {
    var ifaces = os.networkInterfaces();
    var addr;
    Object.keys(ifaces).forEach(function (ifname) {
      var alias = 0;

      ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          return;
        }

        if (alias >= 1) {
          // this single interface has multiple ipv4 addresses
          // console.log(ifname + ':' + alias, iface.address);
        } else {
            if(ifname === 'eth0' || ifname == 'wlan0') {
              // this interface has only one ipv4 adress
              // console.log(ifname, iface.address);
              addr =  iface.address;
          }
        }
        ++alias;
      });
    });
    return addr;
}

function getLANState() {
    // return dev$.select('id="IPStack"').call('getPrimaryLinkState').then(function(result) {
    //     if (result['IPStack']) {
    //         // log.debug('LEDController: IPStack state', JSON.stringify(result));
    //         if (!result['IPStack'] || result['IPStack'].response == null || result['IPStack'].response.error) {
    //             return 'unknown'
    //         }
    //         else if (result['IPStack'].response.result) {
    //             return 'up'
    //         }
    //         else {
    //             return 'down'
    //         }
    //     }
    //     else {
    //         log.error('LEDController: IPStack is not reachable. Unknown state')
    //         return 'unknown'
    //     }
    // })
    return new Promise(function(resolve, reject) {
        if(!getIPV4Address()) {
            resolve('down');
        } else {
            resolve('up');
        }
    });
}

function getTunnelState() {
    return dev$.getReachabilityMap().then(function(reachabilityMap) {
        // log.debug('LEDController: getReachabilityMap- ', JSON.stringify(reachabilityMap));
        if (reachabilityMap['cloud']) {
            return 'connected'
        }
        else {
            return 'connecting'
        }
    }, function(error) {
        log.debug('LEDController: getReachabilityMap Unknown state')
        return 'unknown'
    })
}

function get6LBRState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('wigwag-devices') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.select('id="SixlbrMonitor1"').call('getSlipState').then(function(result) {
        if (result['SixlbrMonitor1']) {
            // log.debug('LEDController: 6LBR monitor state', JSON.stringify(result));
            if (!result['SixlbrMonitor1'] || result['SixlbrMonitor1'].response == null || result['SixlbrMonitor1'].response.error) {
                return 'unknown'
            }
            else if (result['SixlbrMonitor1'].response.result) {
                return 'up'
            }
            else {
                return 'down'
            }
        }
        else {
            log.debug('LEDController: 6LBR monitor is not reachable. Unknown state')
            return 'unknown'
        }
    })
}

function getInsteonState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('Insteon') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.select('id="Insteon"').call('isRunning').then(function(result) {
        if (result['Insteon']) {
            // log.debug('LEDController: Insteon monitor state', JSON.stringify(result));
            if (!result['Insteon'] || result['Insteon'].response == null || result['Insteon'].response.error) {
                return 'unknown'
            }
            else if (result['Insteon'].response.result) {
                return 'up'
            }
            else {
                return 'down'
            }
        }
        else {
            log.debug('LEDController: Insteon monitor is not reachable. Unknown state')
            return 'unknown'
        }
    })
}

function get6LBRPairerState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('wigwag-devices') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.selectByType('WigWag/DevicePairer').listResources().then(function(result) {
        if (result['WigWag/DevicePairer']) {
            // log.debug('LEDController: 6LBR device pairer state', JSON.stringify(result));
            if (!result['WigWag/DevicePairer'] || result['WigWag/DevicePairer'].registered == null || result['WigWag/DevicePairer'].reachable == null) {
                return 'unknown'
            }
            else if (result['WigWag/DevicePairer'].registered && result['WigWag/DevicePairer'].reachable) {
                return 'up'
            }
            else {
                //Bring it up
                return 'down'
            }
        }
        else {
            log.debug('LEDController: 6LBR device pairer is not reachable. Unknown state')
            return 'unknown'
        }
    })
}

function getZWaveState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('ww-zwave') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.select('id="ZwaveMonitor1"').call('getState').then(function(result) {
        if (result['ZwaveMonitor1']) {
            // log.debug('LEDController: ZWave monitor state', JSON.stringify(result));
            if (!result['ZwaveMonitor1'] || result['ZwaveMonitor1'].response == null || result['ZwaveMonitor1'].response.error) {
                return 'unknown'
            }
            else if (result['ZwaveMonitor1'].response.result) {
                return 'up'
            }
            else {
                return 'down'
            }
        }
        else {
            log.debug('LEDController: ZWave monitor is not reachable. Unknown state')
            return 'unknown'
        }
    })
}

function getZWavePairerState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('ww-zwave') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.selectByType('Zwave/DevicePairer').listResources().then(function(result) {
        if (result['Zwave/DevicePairer']) {
            // log.debug('LEDController: Zwave device pairer state', JSON.stringify(result));
            if (!result['Zwave/DevicePairer'] || result['Zwave/DevicePairer'].registered == null || result['Zwave/DevicePairer'].reachable == null) {
                return 'unknown'
            }
            else if (result['Zwave/DevicePairer'].registered && result['Zwave/DevicePairer'].reachable) {
                return 'up'
            }
            else {
                //Bring it up
                return 'down'
            }
        }
        else {
            log.debug('LEDController: Zwave device pairer is not reachable. Unknown state')
            return 'unknown'
        }
    })
}

function getZigbeeHAState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('zigbeeHA') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.select('id="ZigbeeDriver"').call('getState').then(function(result) {
        if (result['ZigbeeDriver']) {
            // log.debug('LEDController: ZigbeeHA monitor state', JSON.stringify(result));
            if (!result['ZigbeeDriver'] || result['ZigbeeDriver'].response == null || result['ZigbeeDriver'].response.error) {
                return 'unknown'
            }
            else if (result['ZigbeeDriver'].response.result) {
                return 'up'
            }
            else {
                return 'down'
            }
        }
        else {
            log.debug('LEDController: ZigbeeHA monitor is not reachable. Unknown state')
            return 'unknown'
        }
    })
}

function getZigbeeHAPairerState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('zigbeeHA') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.selectByType('ZigbeeHA/DevicePairer').listResources().then(function(result) {
        if (result['ZigbeeHA/DevicePairer']) {
            // log.debug('LEDController: ZigbeeHA device pairer state', JSON.stringify(result));
            if (!result['ZigbeeHA/DevicePairer'] || result['ZigbeeHA/DevicePairer'].registered == null || result['ZigbeeHA/DevicePairer'].reachable == null) {
                return 'unknown'
            }
            else if (result['ZigbeeHA/DevicePairer'].registered && result['ZigbeeHA/DevicePairer'].reachable) {
                return 'up'
            }
            else {
                //Bring it up
                return 'down'
            }
        }
        else {
            log.debug('LEDController: ZigbeeHA device pairer is not reachable. Unknown state')
            return 'unknown'
        }
    })
}

function getModbusState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('ModbusRTU') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.selectByID('ModbusDriver').call('getState').then(function(result) {
        if (result['ModbusDriver']) {
            // log.debug('LEDController: ModbusDriver monitor state', JSON.stringify(result));
            if (!result['ModbusDriver'] || result['ModbusDriver'].response == null || result['ModbusDriver'].response.error) {
                return 'unknown';
            }
            else if (result['ModbusDriver'].response.result) {
                return 'up';
            }
            else {
                return 'down';
            }
        }
        else {
            log.debug('LEDController: ModbusDriver monitor is not reachable. Unknown state')
            return 'unknown';
        }
    })
}

function getEncoeanState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('Enocean') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.selectByID('EnoceanDriver').call('getState').then(function(result) {
        if (result['EnoceanDriver']) {
            // log.debug('LEDController: EnoceanDriver monitor state', JSON.stringify(result));
            if (!result['EnoceanDriver'] || result['EnoceanDriver'].response == null || result['EnoceanDriver'].response.error) {
                return 'unknown';
            }
            else if (result['EnoceanDriver'].response.result) {
                return 'up';
            }
            else {
                return 'down';
            }
        }
        else {
            log.debug('LEDController: EnoceanDriver monitor is not reachable. Unknown state')
            return 'unknown';
        }
    })
}

function getBacnetState() {
    if(hardwareConfiguration && hardwareConfiguration.indexOf('BACnet') == -1) {
        return Promise.resolve('NOT_CONFIGURED');
    }
    return dev$.selectByID('BacnetDriver').call('getState').then(function(result) {
        if (result['BacnetDriver']) {
            // log.debug('LEDController: BacnetDriver monitor state', JSON.stringify(result));
            if (!result['BacnetDriver'] || result['BacnetDriver'].response == null || result['BacnetDriver'].response.error) {
                return 'unknown';
            }
            else if (result['BacnetDriver'].response.result) {
                return 'up';
            }
            else {
                return 'down';
            }
        }
        else {
            log.debug('LEDController: BacnetDriver monitor is not reachable. Unknown state')
            return 'unknown';
        }
    })
}

function getVirtualDriverState() {
    return dev$.selectByID('VirtualDeviceDriver').get('status').then(function(result) {
        if (result['VirtualDeviceDriver']) {
            // log.debug('LEDController: EnoceanDriver monitor state', JSON.stringify(result));
            if (!result['VirtualDeviceDriver'] || result['VirtualDeviceDriver'].response == null || result['VirtualDeviceDriver'].response.error) {
                return 'unknown';
            }
            else if (result['VirtualDeviceDriver'].response.result) {
                return 'up';
            }
            else {
                return 'down';
            }
        }
        else {
            log.debug('LEDController: VirtualDeviceDriver is not reachable. Unknown state')
            return 'unknown';
        }
    })
}

function getEdgeCoreStatus() {
    return new Promise(function(resolve, reject) {
        request.get("http://localhost:9101/status", {}, function(err, response, responseBody) {
            if(err) {
                console.error('Failed to parse edge-core statue ' + err);
                resolve('up');
            }
            else {
                if(response && response.statusCode != 200) {
                    console.error('Edge-core status failed with error- ' + response.statusCode);
                    resolve('up');
                } else if(response && responseBody) {
                    try {
                        var resp = JSON.parse(responseBody);
                        if(resp.status == 'connected') {
                            resolve(resp.status);
                        } else {
                            resolve('down');
                        }
                    } catch(err) {
                        console.error('Failed to parse the status ' + err);
                        resolve('up');
                    }
                }
            }
        });
    });
}

function waitForBootup() {
    let ipStack = dev$.select('id="IPStack"')

    ipStack.discover()

    return new Promise(function(resolve, reject) {
        var count = 0

        function n(selection) {
            count += 1

            selection.stopDiscovering()

            if (count == 1) {
                resolve()
            }
        }

        ipStack.on('discover', function() {
            n(ipStack)
        })
    })
}

var hardwareConfiguration = {};
var getHardwareConfiguration = function() {
    var radioProfile = JSON.parse(jsonminify(fs.readFileSync( __dirname + '/../../devicejs-core-modules/rsmi/radioProfile.config.json', 'utf8')));

    var hwversion = radioProfile.hardwareVersion;
    var radioConfig = radioProfile.radioConfig;

    hardwareConfiguration = Object.keys(radioProfile.configurations[hwversion][radioConfig]);
}

var LEDController = function(data) {
    options = data;

    if(typeof options.ledColorProfile !== 'undefined') {
        led.setColorProfile(options.ledColorProfile);
    } else {
        options.ledColorProfile = 'RGB';
    }

    if(typeof options.ledBrightness == 'undefined') {
        options.ledBrightness = 5;
    }

    this._states = {};
}

var LED_STATUS_TABLE = {
    0x01: "BLINKING_GREEN",
    0x02: "GREEN",
    0x10: "BLINKING_BLUE",
    0x20: "BLUE",
    0x80: "RED_ALERT"
}

LEDController.prototype.start = function() {
    var self = this;
    try {
        led.init(options.ledColorProfile, options.ledDriverSocketPath).then(function() {
            log.info('LEDController: Waiting for bootup')
            return Promise.resolve();
        }, function(error) {}).then(function() {
            log.info('LEDController: Started LED controller successfully');

            getHardwareConfiguration();

            let blinkInterval = null
            let currentBlinkLoop = null
            let redAlert = 0;
            var relayUp = false
            var ledSequence = {
                color: [ "#0000FF", "#0000FF" ],
                period: 500
            };
            var ledStatus = 0x00;
            var ledStatusString = "BLUE";

            function startBlinkLoop(r, g, b) {
                let onOrOff = 'on'
                led.stopheartbeat();

                if (currentBlinkLoop) {
                    if (currentBlinkLoop.r == r && currentBlinkLoop.g == g && currentBlinkLoop.b == b) {
                        return
                    }
                }

                stopBlinkLoop()
                currentBlinkLoop = {
                    r,
                    g,
                    b
                }
                blinkInterval = setInterval(function() {
                    if (onOrOff == 'on') {
                        onOrOff = 'off'

                        // if (redAlert) {
                        //     led.alertOn(options.ledBrightness, 0, 0)
                        //     // redAlert = false
                        // }
                        // else {
                            led.setcolor(r, g, b)
                        // }
                    }
                    else {
                        onOrOff = 'on'
                        led.setcolor(0, 0, 0)
                    }
                }, 500)
            }

            function stopBlinkLoop() {
                currentBlinkLoop = null
                clearInterval(blinkInterval)
            }

            function getRadioState() {
                return new Promise(function(resolve, reject) {
                    Promise.all([
                        get6LBRState(),
                        getZWaveState(),
                        getZigbeeHAState(),
                        get6LBRPairerState(),
                        getZWavePairerState(),
                        getZigbeeHAPairerState(),
                        getModbusState(),
                        getBacnetState(),
                        getEncoeanState(),
                        getVirtualDriverState()
                    ]).then(function(states) {
                        self._states.Sixlowpan = states[0];
                        self._states.Zwave = states[1];
                        self._states.Zigbee = states[2];
                        self._states.SixlbrPairer = states[3];
                        self._states.ZwavePairer = states[4];
                        self._states.ZigbeePairer = states[5];
                        self._states.Modbus = states[6];
                        self._states.Bacnet = states[7];
                        self._states.Enocean = states[8];
                        self._states.VirtualDeviceDriver = states[9];
                        log.info('LEDController: peripheral state- ' + JSON.stringify(self._states));

                        if (JSON.stringify(self._states).toLowerCase().indexOf('down') > -1 || JSON.stringify(self._states).toLowerCase().indexOf('unknown') > -1) {
                            //Dont generate red alert right away, see if this continues for 3 more cycles and then do it. 
                            if(redAlert++ > 3) {
                                log.info("LEDController: RED ALERT");
                                led.alertOn(options.ledBrightness, 0, 0);
                            }
                        } else {
                            redAlert = 0;
                            led.alertOff();
                        }
                        resolve();
                    }, function(error) {
                        log.error('LEDController error getStates- ', error);
                        reject(error);
                    });
                });
            }

            function getCloudState() {
                return new Promise(function(resolve, reject) {
                    Promise.all([
                        getLANState(),
                        getTunnelState(),
                        getEdgeCoreStatus()
                    ]).then(function(states) {
                        let lanState = states[0]
                        let tunnelState = states[1]
                        let edgeState = states[2]

                        self._states.LAN = states[0];
                        self._states.Tunnel = states[1];
                        self._states.EdgeCore = states[2];

                        // log.info('LEDController: lan state ' + JSON.stringify(states));

                        if (lanState == 'unknown' && tunnelState == 'unknown') {
                            log.info('LEDController: BLINKING GREEN BLINKING GREEN BLINKING GREEN')
                            startBlinkLoop(0, options.ledBrightness, 0);
                            ledStatus = 0x01;
                            ledSequence.color.push("#00FF00");
                            ledSequence.color.push("#000000");
                        }
                        if (lanState == 'unknown' && tunnelState == 'connecting') {
                            log.info('LEDController: BLINKING GREEN BLINKING GREEN BLINKING GREEN')
                            startBlinkLoop(0, options.ledBrightness, 0);
                            ledStatus = 0x01;
                            ledSequence.color.push("#00FF00");
                            ledSequence.color.push("#000000");
                        }
                        if (lanState == 'unknown' && tunnelState == 'connected' && edgeState == 'connected') {
                            log.info('LEDController: BLUE BLUE BLUE')
                            stopBlinkLoop()
                            led.heartbeat(0, 0, options.ledBrightness, options.heartbeatBrightness);
                            ledStatus = 0x20;
                            ledSequence.color.push("#0000FF");
                            ledSequence.color.push("#0000FF");
                        }
                        if (lanState == 'unknown' && tunnelState == 'connected' && edgeState != 'connected') {
                            log.info('LEDController: BLINKING BLUE BLINKING BLUE BLINKING BLUE')
                            startBlinkLoop(0, 0, options.ledBrightness);
                            ledStatus = 0x10;
                            ledSequence.color.push("#0000FF");
                            ledSequence.color.push("#000000");
                        }
                        if (lanState == 'up' && tunnelState == 'connected' && edgeState != 'connected') {
                            log.info('LEDController: BLINKING BLUE BLINKING BLUE BLINKING BLUE')
                            startBlinkLoop(0, 0, options.ledBrightness);
                            ledStatus = 0x10;
                            ledSequence.color.push("#0000FF");
                            ledSequence.color.push("#000000");
                        }
                        if (lanState == 'unknown' && tunnelState !== 'connected' && edgeState == 'connected') {
                            log.info('LEDController: BLINKING BLUE BLINKING BLUE BLINKING BLUE')
                            startBlinkLoop(0, 0, options.ledBrightness);
                            ledStatus = 0x10;
                            ledSequence.color.push("#0000FF");
                            ledSequence.color.push("#000000");
                        }
                        if (lanState == 'up' && tunnelState !== 'connected' && edgeState == 'connected') {
                            log.info('LEDController: BLINKING BLUE BLINKING BLUE BLINKING BLUE')
                            startBlinkLoop(0, 0, options.ledBrightness);
                            ledStatus = 0x10;
                            ledSequence.color.push("#0000FF");
                            ledSequence.color.push("#000000");
                        }
                        if (lanState == 'up' && tunnelState == 'unknown') {
                            log.info('LEDController: GREEN GREEN GREEN')
                            stopBlinkLoop()
                            led.heartbeat(0, options.ledBrightness, 0, options.heartbeatBrightness);
                            ledStatus = 0x02;
                            ledSequence.color.push("#00FF00");
                            ledSequence.color.push("#00FF00");
                        }
                        if (lanState == 'up' && tunnelState == 'connecting') {
                            log.info('LEDController: BLINKING BLUE BLINKING BLUE BLINKING BLUE')
                            startBlinkLoop(0, 0, options.ledBrightness);
                            ledStatus = 0x10;
                            ledSequence.color.push("#0000FF");
                            ledSequence.color.push("#000000");
                        }
                        if (lanState == 'up' && tunnelState == 'connected' && edgeState == 'connected') {
                            log.info('LEDController: BLUE BLUE BLUE')
                            stopBlinkLoop()
                            led.heartbeat(0, 0, options.ledBrightness, options.heartbeatBrightness);
                            ledStatus = 0x20;
                            ledSequence.color.push("#0000FF");
                            ledSequence.color.push("#0000FF");
                        }
                        if (lanState == 'down' && tunnelState == 'unknown') {
                            log.info('LEDController: BLINKING GREEN BLINKING GREEN BLINKING GREEN')
                            startBlinkLoop(0, options.ledBrightness, 0);
                            ledStatus = 0x01;
                            ledSequence.color.push("#00FF00");
                            ledSequence.color.push("#000000");
                        }
                        if (lanState == 'down' && tunnelState == 'connecting') {
                            log.info('LEDController: BLINKING GREEN BLINKING GREEN BLINKING GREEN')
                            startBlinkLoop(0, options.ledBrightness, 0);
                            ledStatus = 0x01;
                            ledSequence.color.push("#00FF00");
                            ledSequence.color.push("#000000");
                        }
                        if (lanState == 'down' && tunnelState == 'connected') {
                            log.info('LEDController: BLINKING GREEN BLINKING GREEN BLINKING GREEN')
                            startBlinkLoop(0, options.ledBrightness, 0);
                            ledStatus = 0x01;
                            ledSequence.color.push("#00FF00");
                            ledSequence.color.push("#000000");
                        }
                        resolve();
                    }, function(error) {
                        log.error('LEDController: error- ', error)
                        reject(error);
                    });
                });
            }

            function update() {
                ledSequence.color = [];
                Promise.all([
                    getCloudState(),
                    getRadioState()
                ]).then(function() {
                    // console.log("LEDController: redAlert ", redAlert);
                    if(redAlert > 100) {
                        redAlert = 1;
                    }
                    if(redAlert) {
                        ledStatus |= 0x80;
                        ledStatusString = LED_STATUS_TABLE[ledStatus & 0x7F] + " + RED_ALERT"
                        ledSequence.color.push("#FF0000");
                        ledSequence.color.push("#000000");
                    } else {
                        ledStatus &= 0x7F;
                        ledStatusString = LED_STATUS_TABLE[ledStatus];
                    }
                    self._states.ledStatus = ledStatus;
                    self._states.ledSequence = JSON.parse(JSON.stringify(ledSequence));
                    self._states.ledStatusString = ledStatusString;
                }, function(err) {

                });
            }

            setInterval(function() {
                update();
            }, 5000);

            update();
        }, function(error) {
            log.error('LEDController: Unable to start LED controller- ', error)
        })
    } catch(e) {
        log.error('LEDController failed to init ' + JSON.stringify(e));
    }
}

LEDController.prototype.getCurrentState = function() {
    return this._states;
}

LEDController.prototype.setColor = function(r, g, b) {
    return led.setcolor(r, g, b);
}

LEDController.prototype.playTone = function(index) {
    return led.playTone(index);
}

module.exports = LEDController;