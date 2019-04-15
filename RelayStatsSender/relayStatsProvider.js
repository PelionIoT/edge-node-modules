'use strict'
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

const url = require('url')
const fs = require('fs');
const path = require('path')
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const semver = require('semver')
const request = require('request')
const os = require('os');

/*
process command- bash to json parse 
ps aux | grep -E 'device|node' | awk '
BEGIN { ORS = ""; print " [ "}
{ printf "%s{\"user\": \"%s\", \"pid\": \"%s\", \"cpu\": \"%s\", \
    \"mem\": \"%s\", \"vsz\": \"%s\", \"rss\": \"%s\", \"tty\": \"%s\", \
    \"stat\": \"%s\", \"start\": \"%s\", \"time\": \"%s\", \"command\": \"%s\" \
}",
      separator, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, substr($0, index($0,$11))
  separator = ", "
}
END { print " ] " }';
 */

const diagnosticsFormat  = {
    'Relay': {
    },
    'Peripherals': {
    },
    'metadata': {
        "LED Status": "BLUE",
        "LED Sequence": ["#0000FF"]
    }
};

function getRadioStatus(id, command) {
    return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
            return resolve('UNKNOWN');
        }, 1000);
        return dev$.selectByID(id).call(command).then(function(result) {
            clearTimeout(timer);
            if (result[id]) {
                if (!result[id] || result[id].response === null || result[id].response.error) {
                    resolve('UNKNOWN');
                }
                else if (result[id].response.result) {
                    resolve('UP');
                }
                else {
                    resolve('DOWN');
                }
            }
            else {
                resolve('UNKNOWN');
            }
        });
    });
}

function getPeripheralStatus() {
    return dev$.selectByID('LEDDriver').call('getState').then(function(resp) {
        if(resp && resp.LEDDriver && resp.LEDDriver.response && resp.LEDDriver.response.result) {
            return resp.LEDDriver.response.result;
        } else {
            return {};
        }
    });
}

function getCommandData(id, command) {
    return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
            return resolve('UNKNOWN');
        }, 1000);
        return dev$.selectByID(id).call(command).then(function(result) {
            clearTimeout(timer);
            if(result[id]) {
                if (!result[id] || result[id].response === null || result[id].response.error) {
                    resolve('UNKNOWN');
                }
                else if (result[id].response.result) {
                    resolve(result[id].response.result);
                }
                else {
                    resolve('UNKNOWN');
                }

            } else {
                resolve('UNKNOWN');
            }
        });
    });
}


function getIPV4Address() {
    // var ipStack = dev$.select('id="IPStack"');

    // return new Promise(function(resolve, reject) {
    //     ipStack.call('getPrimaryIpAddress').then(function(result) {
    //         if(result.IPStack) {
    //             if(result.IPStack.response && result.IPStack.response.error) {
    //                 return null;
    //             }
    //             else if(result.IPStack.response && result.IPStack.response.result) {
    //                 return result.IPStack.response.result;
    //             }
    //             else {
    //                 return null;
    //             }
    //         }
    //         else {
    //             return null;
    //         }
    //     }).then(function(address) {
    //         if(typeof address === 'string') {
    //             if(address.indexOf('/') != -1) {
    //                 address = address.substring(0, address.indexOf('/'));
    //             }
    //         }
    //         resolve(address);
    //     });
    // });
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

function getSoftwareVersion(versionsFile) {
    return new Promise(function(resolve, reject) {
        if(!versionsFile) {
            return resolve('');
        }
        versionsFile = path.resolve(__dirname, versionsFile);
        fs.readFile(versionsFile, 'utf8', function(err, data) {
            if(err) {
                if(err.code === 'ENOENT') {
                    return resolve('');
                }
                log.error('Failed with error ' + err + JSON.stringify(err));
                resolve('Unable to read version!');
                return;
            }

            let parsedVersion;

            try {
                parsedVersion = JSON.parse(data);
            }
            catch(err) {
                log.error('JSON parse failed ' + err);
                resolve('Unable to read version!');
                return;
            }

            if(!('packages' in parsedVersion)) {
                log.error('No packages listed in versions file');
                resolve('No packages listed in versions file!');
                return;
            }

            if(!Array.isArray(parsedVersion.packages)) {
                log.error('Packages is not an array');
                resolve('Packages is not an array!');
                return;
            }

            let wigwagFirmwareVersion;

            for(let i = 0; i < parsedVersion.packages.length; i += 1) {
                let packageInfo = parsedVersion.packages[i];

                if(packageInfo === null || typeof packageInfo != 'object') {
                    continue;
                }

                if(packageInfo.name != 'WigWag-Firmware') {
                    continue;
                }

                if(!semver.valid(packageInfo.version)) {
                    log.error('WigWag-Firmware version number is not a proper semantic version');
                    resolve('WigWag-Firmware version number is not a proper semantic version');
                    return;
                }

                wigwagFirmwareVersion = packageInfo.version;
            }

            if(!wigwagFirmwareVersion) {
                log.error('No WigWag-Firmware package found in packages array');
                resolve('No WigWag-Firmware package found in packages array');
                return;
            }

            resolve(wigwagFirmwareVersion);
        });
    });
}

function getUserId() {
    let userID = null;
    function next(err, result) {
        if(err) {
            return;
        }

        let prefix = result.prefix;
        userID = result.key.substring(prefix.length);

        let siblings = result.siblings;
        if(siblings.length !== 0) {
            try {
                let metadata = JSON.parse(siblings[0]);
                userID = metadata.email;
            } catch(e) {
                console.error("json parse failed with error- " + e);
            }
        } else {
            console.error("Key was deleted");
        }
    }
    return ddb.cloud.getMatches('wigwag.users.', next).then(function() {
        return userID;
    });
}

function getNumberOfDevices() {
    return dev$.selectByID('DevStateManager').get('devicesPerProtocol').then(function(resp) {
        if(resp && resp.DevStateManager && resp.DevStateManager.response && resp.DevStateManager.response.result) {
            return resp.DevStateManager.response.result;
        } else {
            return {};
        }
    });
}

function getDevicedbVersion() {
    return new Promise(function(resolve, reject) {
        exec("/wigwag/system/bin/devicedb -version", function(error, stdout, stderr) {
            if(!error) {
                try {
                    resolve(stdout.toString().replace(/\n/g, ""));
                } catch(err) {
                    console.error('Relaystats got devicedb version, but failed to parse ', err);
                    resolve('');
                }
            } else {
                console.error('RelayStats failed to get devicedb version ', err);
                resolve('');
            }
        });
    });
}

function getMbedEdgeCoreVersion() {
    return execSync("/wigwag/mbed/edge-core/build/bin/edge-core --version").toString().replace(/\n/g, "");
}

function getEdgeCoreStatus() {
    return new Promise(function(resolve, reject) {
        request.get("http://localhost:9101/status", {}, function(err, response, responseBody) {
            if(err) {
                console.error('Failed to parse edge-core statue ' + err);
                resolve({});
            }
            else {
                if(response && response.statusCode != 200) {
                    console.error('Edge-core status failed with error- ' + response.statusCode);
                    resolve({});
                } else if(response && responseBody) {
                    try {
                        var resp = JSON.parse(responseBody);
                        resolve(resp);
                    } catch(err) {
                        console.error('Failed to parse the status ' + err);
                        resolve({});
                    }
                }
            }
        });
    });
}

/**
 * The MIT License (MIT) Copyright (c) 2016 Hector Leon Zarco Garcia
 * Reference- npm module psaux
 * Normalizes the process payload into a readable object.
 *
 * @param  {Array} list
 * @param  {Array} ps
 * @return {Array}
 */
function parseProcesses(list, ps) {
  var p = ps.split(/ +/);

  list.push({
    user: p[0],
    pid: p[1],
    cpu: parseFloat(p[2]),
    mem: parseFloat(p[3]),
    vsz: p[4],
    rss: p[5],
    tt: p[6],
    stat: p[7],
    started: p[8],
    time: p[9],
    command: p.slice(10).join(' ')
  });

  return list;
}

/**
 * The MIT License (MIT) Copyright (c) 2016 Hector Leon Zarco Garcia
 * Reference- npm module psaux
 * Return elements that match a certain query:
 *
 * @example
 *   list.query({
 *     user: 'root',
 *     cpu: '>10',
 *     mem: '>5 <10',
 *     command: '~chrome'
 *   })
 *
 * @param  {Object} q
 * @return {Array}
 */
function query(q) {
  var filter = Object.keys(q);
  var isValid;
  var valid;
  var val;

  return this.reduce((list, ps) => {
    isValid = filter.every(key => {
      val = q[key];
      valid = true;

      if (typeof val === 'string') {
        if (val.indexOf('<') > -1) {
          valid = ps[key] < cleanValue(val, '<');
        }

        if (valid && val.indexOf('>') > -1) {
          valid = ps[key] > cleanValue(val, '>');
        }

        if (valid && val.indexOf('~') > -1) {
          valid = ps[key].indexOf(q[key].replace('~', '')) > -1;
        }
      } else {
        valid = ps[key] === val;
      }

      return valid;
    });

    if (isValid) list.push(ps);

    return list;
  }, []);
}

/**
 * The MIT License (MIT) Copyright (c) 2016 Hector Leon Zarco Garcia
 * Reference- npm module psaux
 * Return the value for a certain condition
 *
 * @example
 *   cleanValue('foo <100', '<') == 100
 *   cleanValue('>5 <1 bar', '>') == 5
 *
 * @param  {String} val
 * @param  {String} char
 * @return {Float}
 */
function cleanValue(val, char) {
  var num;
  var conditions = val.split(' ');
  var i = 0;

  while (!num && i < conditions.length) {
    if (conditions[i].indexOf(char) > -1) {
      num = conditions[i].replace(/<|>|~/g, '');
    }
    i++;
  }

  return parseFloat(num);
}

function allProcesses() {
  return new Promise((resolve, reject) => {
    exec('/bin/ps aux', function(error, stdout, stderr) {
            if(!error) {
                var processes = stdout.split('\n');

                //Remove header
                processes.shift();
                processes = processes.reduce(parseProcesses, []);
                // console.log(processes);
                processes.query = query;
                resolve(processes);
            } else {
                resolve([]);
            }
        });
    });
}

var RelayStatsProvider = {
    start: function(obj) {
        var self = this;
        log.info('Starting controller with id ' + obj.id);
        this._options = obj;
        this._startedOn = new Date();

        this._tunnelRunning = false;
        this._tunnelRunningTimer = null;

        //Validate whether events are reaching cloud and 
        //Also if devicedb is connected to cloud

        this._diagnosticsInProgress = false;
        this._diagnosticsTimer = setInterval(function() {
            if(!self._diagnosticsInProgress) {
                self._diagnosticsInProgress = true;
                try {
                    self.commands.diagnostics('-s').then(function(data) {
                        self._diagnosticsInProgress = false
                        data.metadata.timestamp = Date.now();
                        ddb.shared.put('relay-diagnostics-data', JSON.stringify(data));
                    }, function(err) {
                        self._diagnosticsInProgress = false;
                    });
                } catch(err) {
                    self._diagnosticsInProgress = false;
                }
            } else {
                setTimeout(function() {
                    self._diagnosticsInProgress = false;
                }, 10000);
            }
        }, 30000);
    },
    stop: function(){

    },
    state: {
        diagnostics: {
            get: function() {
                return new Promise(function(resolve, reject) {
                    ddb.shared.get('relay-diagnostics-data').then(function(result) {
                        if(result && result.siblings && result.siblings[0]) {
                            resolve(JSON.parse(result.siblings[0]));
                        } else {
                            reject('Failed to get diagnostics data!');
                        }
                    }, function(err) {
                        reject('Failed to get data ' + err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Read only facade');
            }
        }
    },
    commands: {
        ipAddress: function() {
            return getIPV4Address();
        },
        softwareVersion: function(filePath) {
            if(typeof filePath.resourceSet !== 'undefined') filePath = null;
            return getSoftwareVersion(filePath || this._options.versionsFile);
        },
        factorySoftwareVersion: function(filePath) {
            if(typeof filePath.resourceSet !== 'undefined') filePath = null;
            return getSoftwareVersion(filePath || this._options.factoryVersionsFile);
        },
        info: function() {
            let self = this;
            let p = [];
            let ret = {};

            return new Promise(function(resolve, reject) {
                p.push(getSoftwareVersion(self._options.versionsFile));
                p.push(getSoftwareVersion(self._options.userVersionsFile));
                p.push(getSoftwareVersion(self._options.upgradeVersionsFile));
                p.push(getSoftwareVersion(self._options.factoryVersionsFile));
                p.push(getIPV4Address());
                p.push(self.commands.startedOn());
                p.push(self.commands.upTime());
                p.push(getUserId());
                p.push(self.commands.execute('uptime'));

                Promise.all(p).then(function(resp) {
                    ret = self._options.relayInfo ? JSON.parse(JSON.stringify(self._options.relayInfo)) : {};
                    ret.currentSoftwareVersion = resp[0];
                    ret.userPartitionSoftwareVersion = resp[1];
                    ret.upgradePartitionSoftwareVersion = resp[2];
                    ret.factoryPartitionSoftwareVersion = resp[3];
                    ret.ipAddress = resp[4];
                    ret.startedOn = resp[5];
                    ret.upTime = resp[6];
                    ret.accountId = resp[7];
                    ret.systemUptime = resp[8];
                    resolve(ret);
                }, function(err) {
                    reject(err);
                });
            });
        },
        devicedbVersion: function() {
            return getDevicedbVersion();
        },
        diagnostics: function(flag) {
            var self = this;
            var p = [];
            return new Promise(function(resolve, reject) {
                p.push(self.commands.info());
                p.push(getPeripheralStatus());
                p.push(getCommandData('ZigbeeDriver', 'getChannel'));
                p.push(getCommandData('ZigbeeDriver', 'getPanId'));
                p.push(getCommandData('SixlbrMonitor1', 'getChannel'));
                p.push(getCommandData('SixlbrMonitor1', 'getPanId'));
                p.push(getCommandData('ZwaveMonitor1', 'getZwaveControllerInfo'));
                p.push(getCommandData('ModbusDriver', 'getSerialPort'));
                p.push(getCommandData('BacnetDriver', 'getSerialPort'));
                p.push(getCommandData('EnoceanDriver', 'getSerialPort'));
                p.push(getDevicedbVersion());
                p.push(self.commands.systeminfo());
                p.push(getNumberOfDevices());
                if(self._options.cloudAddress.indexOf('mbed') > -1) {
                    // p.push(getMbedEdgeCoreVersion());
                    p.push(getEdgeCoreStatus());
                }
                Promise.all(p).then(function(result) {
                    delete diagnosticsFormat.System;
                    diagnosticsFormat.Relay['Relay ID'] = result[0].serialNumber;
                    diagnosticsFormat.Relay['Relay IP Address'] = result[0].ipAddress;
                    diagnosticsFormat.Relay['Pairing Code'] = result[0].pairingCode;
                    diagnosticsFormat.Relay['Relay software version'] = result[0].currentSoftwareVersion;
                    diagnosticsFormat.Relay['Relay hardware version'] = result[0].hardwareVersion;
                    diagnosticsFormat.Relay['Radio config'] = result[0].radioConfig;
                    diagnosticsFormat.Relay['Relay LED config'] = result[0].ledConfig;
                    diagnosticsFormat.Relay['Ethernet MAC'] = result[0].ethernetMac;
                    diagnosticsFormat.Relay['Software Uptime'] = result[0].upTime;
                    diagnosticsFormat.Relay['System Uptime'] = result[0].systemUptime.split(',')[0].trim();
                    diagnosticsFormat.Relay['SSH'] = result[0].systemUptime.split(',')[1].trim();
                    diagnosticsFormat.Relay['Devicedb version'] = result[10];
                    diagnosticsFormat.Relay["LED Status"] = result[1].ledStatusString;
                    diagnosticsFormat.Relay["Cloud"] = self._options.cloudAddress;
                    diagnosticsFormat.metadata["LED Status"] = result[1].ledStatusString;
                    diagnosticsFormat.metadata["LED Sequence"] = result[1].ledSequence;
                    diagnosticsFormat.Peripherals['ZigBee'] = result[1].Zigbee || 'UNKNOWN';
                    diagnosticsFormat.Peripherals['ZigBee channel'] = result[2];
                    diagnosticsFormat.Peripherals['ZigBee PAN ID'] = result[3];
                    diagnosticsFormat.Peripherals['Z-Wave'] = result[1].Zwave || 'UNKNOWN';
                    diagnosticsFormat.Peripherals['6LoWPAN'] = result[1].Sixlowpan || 'UNKNOWN';
                    diagnosticsFormat.Peripherals['6LoWPAN channel'] = result[4];
                    diagnosticsFormat.Peripherals['6LoWPAN PAN ID'] = result[5];
                    diagnosticsFormat.Peripherals['Modbus'] = result[1].Modbus || 'UNKNOWN';
                    diagnosticsFormat.Peripherals['Modbus serial port'] = result[7];
                    diagnosticsFormat.Peripherals['Bacnet'] = result[1].Bacnet || 'UNKNOWN';
                    diagnosticsFormat.Peripherals['Bacnet serial port'] = result[8];
                    diagnosticsFormat.Peripherals['Enocean'] = result[1].Enocean || 'UNKNOWN';
                    diagnosticsFormat.Peripherals['Enocean serial port'] = result[9];
                    diagnosticsFormat.Peripherals['Z-Wave home ID'] = result[6].homeId;
                    diagnosticsFormat.Peripherals['Virtual'] = result[1].VirtualDeviceDriver || 'UNKNOWN';
                    diagnosticsFormat.DevicesPerProtocol = result[12];
                    // if((typeof flag == 'string') && (flag == '-s')) {
                        diagnosticsFormat.System = result[11];
                    // }
                    if(self._options.cloudAddress.indexOf('mbed') > -1) {
                        // diagnosticsFormat.Relay['Edge-core version'] = result[13];
                        diagnosticsFormat.Relay['Mbed Edge Core'] = result[13];
                    }
                    resolve(diagnosticsFormat);
                }, function(err) {
                    reject(err);
                });
            });
        },
        systeminfo: function() {
            var self = this;
            var p = [];
            return new Promise(function(resolve, reject) {
                p.push(self.commands.execute("awk '/MemTotal/ {print $2}' /proc/meminfo"));
                p.push(self.commands.memoryConsumed());
                p.push(self.commands.du('/var/log/'));
                p.push(self.commands.df('overlay/factory'));
                p.push(self.commands.df('userdata'));
                p.push(self.commands.df('overlay/user'));
                p.push(self.commands.cpu());
                p.push(self.commands.execute("awk '/MemAvailable/ {print $2}' /proc/meminfo"));
                p.push(self.commands.processes());
                Promise.all(p).then(function(result) {
                    var ret = {};
                    try {
                        var memtotal = parseInt(JSON.parse(result[0]).toString().replace(/\n/g, ""));
                        ret["Total Memory"] = Math.round(memtotal/1000) + 'MB';
                        ret["Memory Consumed"] = result[1];
                        ret["Varlog"] = Math.round(result[2] * 10000 / memtotal)/100 + '%';
                        ret["Factory Disk"] = result[3];
                        ret["Database"] = result[4];
                        ret["User Disk"] = result[5];
                        ret["CPU"] = result[6];
                        ret["Memory Available"] = (Math.round(parseInt(JSON.parse(result[7]).toString().replace(/\n/g, "")) * 10000 / memtotal) / 100) + '%'; 
                        ret["Processes"] = result[8];
                        // ret["Upgrade Disk"] = result[7];
                        // ret["Boot Disk"] = result[8];
                        // console.log(ret);
                        resolve(ret);
                    } catch(e) {
                        reject(e);
                    }
                }, function(err) {
                    reject(err);
                });
            });
        },
        processes: function() {
            return new Promise(function(resolve, reject) {
                allProcesses().then(list => {
                    let inefficient = list.query({
                        mem: '>2'
                    });
                    // console.log(inefficient);
                    resolve(inefficient);
                });
            });
        },
        cpu: function() {
            return execSync("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage \"%\"}'").toString().replace(/\n/g, "");
        },
        dudir: function(str) {
            return execSync("du -a / | sort -n -r | head -n 15").toString().replace(/\n/g, "");
        },
        du: function(str) {
            return execSync("du -s " + str + " | awk '{print $1}'").toString().replace(/\n/g, "");
        },
        df: function(str) {
            return execSync("df -h | grep " + str + " | awk '{print $5}'").toString().replace(/\n/g, "");
        },
        relayInfo: function() {
            return this.commands.info();
        },
        stats: function() {
            return this.commands.info();
        },
        user: function() {
            return getUserId();
        },
        userId: function() {
            return this.commands.user();
        },
        email: function() {
            return this.commands.user();
        },
        account: function() {
            return this.commands.user();
        },
        startTime: function() {
            return this._startedOn.toString();
        },
        startedOn: function() {
            return this.commands.startTime();
        },
        upTime: function() {
            function timeConversion(millisec) {
                var seconds = (millisec / 1000).toFixed(1);
                var minutes = (millisec / (1000 * 60)).toFixed(1);
                var hours = (millisec / (1000 * 60 * 60)).toFixed(1);
                var days = (millisec / (1000 * 60 * 60 * 24)).toFixed(1);

                if (seconds < 60) {
                    return seconds + " Sec";
                } else if (minutes < 60) {
                    return minutes + " Min";
                } else if (hours < 24) {
                    return hours + " Hrs";
                } else {
                    return days + " Days";
                }
            }
            var present = new Date();
            return timeConversion(present.getTime() - this._startedOn.getTime());
        },
        memoryConsumed: function() {
            return execSync('free | grep Mem | awk \'{print int(($2 - $7)/$2 * 10000)/100 }\'').toString().replace(/\n/g, "") + "%";
        },
        stopTunnel: function() {
            var self = this;
            console.log('SupportTunnel: in stop support tunnel');
            return new Promise(function(resolve, reject) {
                clearTimeout(self._tunnelRunningTimer);
                exec('curl -i localhost:3000/stop', function(error, stdout, stderr) {
                    if(!error) {
                        console.log('SupportTunnel: Stop tunnel successful');
                        self._tunnelRunning = false;
                        resolve('Stopped successfully');
                    } else {
                        console.error('SupportTunnel: stopping tunnel failed with error- ' + JSON.stringify(error));
                        reject(new Error('Could not stop tunnel ' + JSON.stringify(error)));
                    }
                });
            });
        },
        startTunnel: function() {
            var self = this;
            //Start support tunnel but disconnect it in an hour
            return new Promise(function(resolve, reject) {
                if(self._tunnelRunning) {
                    console.log('SupportTunnel: Tunnel already running, stopping first');
                    self.commands.stopTunnel();
                }

                exec('cat /home/root/.ssh/known_hosts | grep tunnel.wigwag.com', function(error, stdout, stderr) {
                    console.log('SupportTunnel: got known hosts stdout- ' + JSON.stringify(stdout));
                    if (stdout === undefined || stdout === "") {
                        try {
                            console.log('SupportTunnel: no known hosts, adding');
                            execSync('cat /wigwag/support/known_hosts >> /home/root/.ssh/known_hosts');
                        }
                        catch (err) {
                            console.error('SupportTunnel: command failed- cat /wigwag/support/known_hosts >> /home/root/.ssh/known_hosts');
                        }
                    }
                    exec('curl -i localhost:3000/start', function(error, stdout, stderr) {
                        if(!error) {
                            console.log('SupportTunnel: start tunnel successful');
                            self._tunnelRunning = true;
                            clearTimeout(self._tunnelRunningTimer);
                            self._tunnelRunningTimer = setTimeout(function() {
                                self.commands.stopTunnel();
                            }, 3600000);
                            resolve('Started tunnel successfully');
                        } else {
                            console.error('SupportTunnel: start tunnel failed with error- ' + JSON.stringify(error));
                            reject(error);
                        }
                    });
                });
            });
        },
        execute: function(command) {
            return new Promise(function(resolve, reject) {
                 exec(command, function(error, stdout, stderr) {
                    if(!error) {
                        resolve(stdout.replace(/\n/g, ""));
                    } else {
                        console.error('SupportTunnel: execute command failed- ' + JSON.stringify(error));
                        reject(error);
                    }
                });
            });
        }
    }
};

module.exports = dev$.resource('RelayStats', RelayStatsProvider);