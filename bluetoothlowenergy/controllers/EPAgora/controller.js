/*
* Copyright (c) 2019, Arm Limited and affiliates.
* SPDX-License-Identifier: Apache-2.0
*
* Licensed under the Apache License, Version 2.0 (the “License”);
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an “AS IS” BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';
const Logger = require('./../../utils/logger');

//Reference- https://nordicsemiconductor.github.io/Nordic-Thingy52-FW/documentation/firmware_architecture.html
//https://infocenter.nordicsemi.com/pdf/Thingy_UG_v1.1.pdf

var EPAgora = {
    start: function(options) {
        var self = this;
        this._ble = options.ble;
        this._peripheralID = options.peripheralID;
        this._deviceID = options.deviceID;
        this._supportedStates = options.supportedStates;
        this._uuids = options.services;

        this._states = {
            subscribe: {},
            rssi: 0,
            temperature: 0,
            humidity: 0,
            co2: 0,
            bvoc: 0,
            pressure: 0,
            magnetometer:
            { x: 0,
             y: 0,
             z: 0 },
            airQualityScore: 0,
            airQualityAccuracyScore: 0,
            luminance: 0,
            gyroscope:
            { x: 0,
             y: 0,
             z: 0 },
            accelerometer:
            { x: 0,
             y: 0,
             z: 0 },
            power: 'off',
            battery: 0
        };

        this._logger = new Logger({tag: this._deviceID, color: 'white'});

        this._logger.info("Supported states " + JSON.stringify(this._supportedStates));
        this.emit('reachable');

        this.onTemperature = function(data) {
            self._states.temperature = data.readInt16LE(0)/10;
            self._logger.info("temperature: " + self._states.temperature);
        };

        this.onHumidity = function(data) {
            self._states.humidity = data.readUInt16LE(0)/10;
            self._logger.info("humidity: " + self._states.humidity);
        };

        this.onCo2 = function(data) {
            self._states.co2 = data.readInt32LE(0)/(1<<30);
            self._logger.info("co2: " + self._states.co2);
        };

        this.onPressure = function(data) {
            self._states.pressure = data.readUInt32LE(0)/1000;
            self._logger.info("pressure: " + self._states.pressure);
        };

        this.onBvoc = function(data) {
            self._states.bvoc = data.readInt32LE(0)/(1<<30);
            self._logger.info("bvoc: " + self._states.bvoc);
        };

        this.onAirQualityScore = function(data) {
            self._states.airQualityScore = data.readUInt16LE(0);
            self._logger.info("airQualityScore: " + self._states.airQualityScore);
        };

        this.onAirQualityAccuracyScore = function(data) {
            self._states.airQualityAccuracyScore = data.readUInt8(0);
            self._logger.info("airQualityAccuracyScore: " + self._states.airQualityAccuracyScore);
        };

        this.onGasResistance = function(data) {
            self._states.gas = data.readUInt32LE(0);
            self._logger.info("gasResistance: " + self._states.gas);
        };

        this.onAccelerometer = function(data) {
            self._states.accelerometer = {
                x : data.readInt32LE(0)/(1<<30),
                y : data.readInt32LE(4)/(1<<30),
                z : data.readInt32LE(8)/(1<<30)
            };
            self._logger.info("accelerometer: " + JSON.stringify(self._states.accelerometer));
        };

        this.onGyroscope = function(data) {
            self._states.gyroscope = {
                x : data.readInt32LE(0)/(1<<30),
                y : data.readInt32LE(4)/(1<<30),
                z : data.readInt32LE(8)/(1<<30)
            };
            self._logger.info("gyroscope: " + JSON.stringify(self._states.gyroscope));
        };

        this.onMagnetometer = function(data) {
            self._states.magnetometer = {
                x : data.readInt32LE(0)/(1<<30),
                y : data.readInt32LE(4)/(1<<30),
                z : data.readInt32LE(8)/(1<<30)
            };
            self._logger.info("magnetometer: " + JSON.stringify(self._states.magnetometer));
        };

        this.onLuminance = function(data) {
            self._states.luminance = data.readUInt32LE(0);
            self._logger.info("luminance: " + self._states.luminance);
        };

        this.onTimeOfFlight = function(data) {
            self._states.tof = data.readUInt16LE(0);
            self._logger.info("timeOfFlight: " + self._states.tof);
        };

        this.onPower = function(data) {
            if(!data[0]) self._states.power = 'off';
            else self._states.power = 'on';
            self._logger.info("power: " + self._states.power);
        };

        this.onBattery = function(data) {
            self._states.battery = data.readUInt32LE(0);
            self._logger.info("battery: " + self._states.battery);
        };

        this.onNotify = {
            "temperature": this.onTemperature,
            "humidity": this.onHumidity,
            "pressure": this.onPressure,
            "co2": this.onCo2,
            "bvoc": this.onBvoc,
            "airQualityScore": this.onAirQualityScore,
            "airQualityAccuracyScore": this.onAirQualityAccuracyScore,
            "gasResistance": this.onGasResistance,
            "accelerometer": this.onAccelerometer,
            "gyroscope": this.onGyroscope,
            "magnetometer": this.onMagnetometer,
            "luminance": this.onLuminance,
            "power": this.onPower,
            "timeOfFlight": this.onTimeOfFlight,
            "battery": this.onBattery,
        };

        this._subscribeToStates = function() {
            Object.keys(self._uuids).forEach(function(st) {
                if(typeof self._uuids[st].subscribe !== 'undefined') {
                    self.state.subscribe.set({[st]: self._uuids[st].subscribe});
                }
            });
        };

        this._updateRSSI = function() {
            if(!self._isRssiRunning) {
                self._rssiInterval = setInterval(function() {
                    // console.log('get rssi value!' + self._connected);
                    self.state.rssi.get().then(function(ssi) {
                        if(Math.abs(self._states.rssi - ssi) > 2) {
                            self._states.rssi = ssi;
                            self._logger.debug("RSSI: " + ssi);
                            dev$.publishResourceStateChange(self._deviceID, "rssi", self._states.rssi);
                        }
                    }, function(err) {
                        self._logger.warn("Failed to get RSSI value " + err);
                    });
                }, 10000);
            } else {
                self._logger.trace('rssi monitor already running!');
            }
        };

        this._stopRSSI = function() {
            clearInterval(self._rssiInterval);
            self._isRssiRunning = false;
        };
        this._updateRSSI();

        this._ble.removeAllListeners('disconnect-'+this._peripheralID);
        this._ble.on('disconnect-'+this._peripheralID, function() {
            self._logger.debug("Got disconnect event!");
            self._stopRSSI();
            self._connected = false;
            self.emit('unreachable');
        });
        this._ble.removeAllListeners('connect-'+this._peripheralID);
        this._ble.on('connect-'+this._peripheralID, function() {
            self._logger.debug("Got connect event!");
            self._updateRSSI();
            // self._connected = true;
            self.emit('reachable');
        });
        self._connected = true;
        this._logger.info("Device controller initialized successfully!");
    },
    stop: function() {
        this._stopRSSI();
        this._ble.removeAllListeners('disconnect-'+this._peripheralID);
        this._ble.removeAllListeners('connect-'+this._peripheralID);
        this._ble.disconnect(this._peripheralID);
    },
    state: {
        rssi: {
            get: function() {
                var self = this;
                return self._ble.getRssi(self._peripheralID);
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        gasResistance: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.gasResistance.serviceID, self._uuids.gasResistance.characteristicID).then(function(data) {
                        self.onNotify.gasResistance(data);
                        resolve(self._states.gasResistance);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        timeOfFlight: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.timeOfFlight.serviceID, self._uuids.timeOfFlight.characteristicID).then(function(data) {
                        self.onNotify.timeOfFlight(data);
                        resolve(self._states.timeOfFlight);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        battery: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.battery.serviceID, self._uuids.battery.characteristicID).then(function(data) {
                        self.onNotify.battery(data);
                        resolve(self._states.battery);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        power: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.power.serviceID, self._uuids.power.characteristicID).then(function(data) {
                        self.onNotify.power(data);
                        resolve(self._states.power);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function(data) {
                var self = this;
                var buffer = new Buffer(1);
                if(data == 'on')
                    buffer.writeUInt8(1, 0);
                else
                    buffer.writeUInt8(0, 0);
                    // return this.state.rgb.set(this._states.rgb);
                // } else {
                return this._ble.writeCharacteristic(this._peripheralID, this._uuids.power.serviceID, this._uuids.power.characteristicID, false, buffer);
                // }
            }
        },
        luminance: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.luminance.serviceID, self._uuids.luminance.characteristicID).then(function(data) {
                        self.onNotify.luminance(data);
                        resolve(self._states.luminance);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        accelerometer: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.accelerometer.serviceID, self._uuids.accelerometer.characteristicID).then(function(data) {
                        self.onNotify.accelerometer(data);
                        resolve(self._states.accelerometer);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        airQualityAccuracyScore: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.airQualityAccuracyScore.serviceID, self._uuids.airQualityAccuracyScore.characteristicID).then(function(data) {
                        self.onNotify.airQualityAccuracyScore(data);
                        resolve(self._states.airQualityAccuracyScore);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        airQualityScore: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.airQualityScore.serviceID, self._uuids.airQualityScore.characteristicID).then(function(data) {
                        self.onNotify.airQualityScore(data);
                        resolve(self._states.airQualityScore);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        gyroscope: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.gyroscope.serviceID, self._uuids.gyroscope.characteristicID).then(function(data) {
                        self.onNotify.gyroscope(data);
                        resolve(self._states.gyroscope);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        magnetometer: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.magnetometer.serviceID, self._uuids.magnetometer.characteristicID).then(function(data) {
                        self.onNotify.magnetometer(data);
                        resolve(self._states.magnetometer);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        temperature: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.temperature.serviceID, self._uuids.temperature.characteristicID).then(function(data) {
                        self.onNotify.temperature(data);
                        resolve(self._states.temperature);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        humidity: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.magnetometer.serviceID, self._uuids.magnetometer.characteristicID).then(function(data) {
                        self.onNotify.humidity(data);
                        resolve(self._states.humidity);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        co2: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.magnetometer.serviceID, self._uuids.magnetometer.characteristicID).then(function(data) {
                        self.onNotify.co2(data);
                        resolve(self._states.co2);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        bvoc: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.magnetometer.serviceID, self._uuids.magnetometer.characteristicID).then(function(data) {
                        self.onNotify.bvoc(data);
                        resolve(self._states.bvoc);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        pressure: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.magnetometer.serviceID, self._uuids.magnetometer.characteristicID).then(function(data) {
                        self.onNotify.pressure(data);
                        resolve(self._states.pressure);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        subscribe: {
            get: function() {
                return this._states.subscribe;
            },
            set: function(input) {
                var self = this;
                return new Promise(function(resolve, reject) {
                    var p = [];
                    Object.keys(input).forEach(function(st) {
                        if(self._supportedStates.indexOf(st) > -1) {
                            // if(typeof self._states.subscribe[st] == 'undefined' || input[st] != self._states.subscribe[st]) {
                                p.push(
                                    self._ble.notifyCharacteristics(self._peripheralID, self._uuids[st].serviceID, self._uuids[st].characteristicID, self.onNotify[st], input[st]).then(function() {
                                        self._logger.info("Got subscription request for state=" + st + ", subscribe=" + input[st]);
                                        self._states.subscribe[st] = input[st];
                                    })
                                );
                            // }
                        } else {
                            self._logger.warn("State is not supported by this device! Supported states are - " + JSON.stringify(self._supportedStates) + " received - " + st);
                        }
                    });

                    Promise.all(p).then(function() {
                        resolve();
                    }, function(err) {
                        reject(err);
                    });
                });
            }
        }
    },
    getState: function() {
        var s = {};
        var self = this;
        var p = [];

        var rejected = false;

        return new Promise(function(resolve, reject) {

            self._supportedStates.forEach(function(type) {
                p.push(
                    new Promise(function(resolve, reject) {
                        self.state[type].get().then(function(value) {
                            if(value !== null) {
                                s[type] = value;
                            }
                            resolve();
                        }).catch(function(e) {
                            s[type] = e;
                            rejected = true;
                            resolve();
                        });
                    })
                );
            });

            Promise.all(p).then(function() {
                if(!rejected) {
                    return resolve(s);
                } else {
                    return reject(JSON.stringify(s));
                }
            });
        });
    },
    setState: function(value) {
        var self = this;
        var s = {};
        var p = [];

        var rejected = false;

        return new Promise(function(resolve, reject) {
            Object.keys(value).forEach(function(key) {
                p.push(
                    new Promise(function(resolve, reject) {
                        if(self._supportedStates.indexOf(key) > -1) {
                            self.state[key].set(value[key]).then(function(result) {
                                s[key] = (result === undefined) ? 'Updated successfully to value ' + value[key] : result;
                                resolve();
                            }).catch(function(e) {
                                s[key] = e;
                                rejected = true;
                                resolve();
                            });
                        } else {
                            rejected = true;
                            s[key] = 'This interface is not supported';
                            resolve();
                        }
                    })
                );
            });

            Promise.all(p).then(function(result) {
                if(!rejected) {
                    resolve(s);
                } else {
                    reject(JSON.stringify(s));
                }
            }, function(e) {
                reject(e);
            });
        });
    },
    commands: {
    }
};

module.exports = EPAgora;
