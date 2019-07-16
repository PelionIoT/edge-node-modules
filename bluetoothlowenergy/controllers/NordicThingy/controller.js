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

var Thingy = {
    start: function(options) {
        var self = this;
        this._ble = options.ble;
        this._peripheralID = options.peripheralID;
        this._deviceID = options.deviceID;
        this._supportedStates = options.supportedStates;
        this._uuids = options.services;

        this._states = {
            "power": "on",
            "temperature": 0,
            "humidity": 0,
            "co2": 0,
            "tvoc": 0,
            "color": {
                red: 0,
                green: 0,
                blue: 0,
                clear: 0
            },
            stepCounter: {
                steps : 0,
                time : 0
            },
            "pressure": 0,
            "button": true,
            "quaternion": {
                w:0, x:0, y:0, z:0
            },
            "euler": {
                "roll":0, "pitch": 0, "yaw": 0
            },
            "heading": 0,
            "gyroscope": {
                x:0, y:0, z:0
            },
            "accelerometer": {
                x:0, y:0, z:0
            },
            "magnetometer": {
                x:0, y:0, z:0
            },
            "gravity": {
                x:0,y:0,z:0
            },
            "rotation": {
                m_11:0, m_12: 0, m_13: 0,
                m_21:0, m_22: 0, m_23: 0,
                m_31:0, m_32: 0, m_33: 0
            },
            "rgb": {
                "mode": "constant",
                "data": {
                    r: 0,
                    g: 10,
                    b: 10
                }
            },
            "rssi": -100,
            "battery": 100,
            "subscribe": {
            }
        };

        this._logger = new Logger({tag: this._deviceID, color: 'white'});

        this._logger.info("Supported states " + JSON.stringify(this._supportedStates));
        this.emit('reachable');

        this.onTemperature = function(data) {
            var temperature = data.readInt8(0) + (data.readUInt8(1)/100);
            if(Math.abs(self._states.temperature - temperature) > self._uuids.temperature.threshold) {
                self._logger.info("Temperature: " + temperature);
                self._states.temperature = temperature;
                dev$.publishResourceStateChange(self._deviceID, "temperature", temperature);
            }
        };

        this.onHumidity = function(data) {
            var humid = data.readUInt8(0);
            if(Math.abs(self._states.humidity - humid) > self._uuids.humidity.threshold) {
                self._logger.info("Humidity: " + humid);
                self._states.humidity = humid;
                dev$.publishResourceStateChange(self._deviceID, "humidity", humid);
            }
        };

        this.onCo2 = function(data) {
            var gas = {
                co2 : data.readUInt16LE(0),
                tvoc : data.readUInt16LE(2)
            };
            if(Math.abs(self._states.co2 - gas.co2) > self._uuids.co2.threshold ||
                Math.abs(self._states.tvoc - gas.tvoc) > self._uuids.co2.threshold) {
                self._logger.info("Gas: " + JSON.stringify(gas));
                self._states.co2 = gas.co2;
                dev$.publishResourceStateChange(self._deviceID, "co2", gas.co2);
                self._states.tvoc = gas.tvoc;
                dev$.publishResourceStateChange(self._deviceID, "tvoc", gas.tvoc);
            }
        };

        this.onColor = function(data) {
            var color = {
                red :   data.readUInt16LE(0),
                green : data.readUInt16LE(2),
                blue :  data.readUInt16LE(4),
                clear : data.readUInt16LE(6)
            };
            self._logger.info("Color: " + JSON.stringify(color));
            self._states.color = color;
            dev$.publishResourceStateChange(self._deviceID, "color", color);
        };

        this.onPressure = function(data) {
            var pressure = data.readInt32LE(0) + (data.readUInt8(4)/100);
            if(Math.abs(self._states.pressure - pressure) > self._uuids.pressure.threshold) {
                self._logger.info("Pressure: " + JSON.stringify(pressure));
                self._states.pressure = pressure;
                dev$.publishResourceStateChange(self._deviceID, "pressure", pressure);
            }
        };

        this.onButton = function(data) {
            if (data.readUInt8(0)) {
                self._logger.info("Button: " + "pressed");
                self._states.button = true;
                dev$.publishResourceStateChange(self._deviceID, "button", true);
            }
            else {
                self._logger.info("Button: " + "released");
                self._states.button = false;
                dev$.publishResourceStateChange(self._deviceID, "button", false);
            }
        };

        this.onTap = function(data) {
            var tapData = {
                direction   : data.readUInt8(0),
                count       : data.readUInt8(1)
            };
                self._states.tap = tapData;
                self._logger.info("Tap: " + JSON.stringify(tapData));
                dev$.publishResourceStateChange(self._deviceID, "tap", tapData);
        };

        this.onOrientation = function(data) {
            var orientation = data.readUInt8(0);
            self._states.orientation = orientation;
            self._logger.info("orientation: " + JSON.stringify(orientation));
            dev$.publishResourceStateChange(self._deviceID, "orientation", orientation);
        };

        this._quaternionThrottleCount = 0;
        this.onQuaternion = function(data) {
            var quaternion = {
                w : data.readInt32LE(0)/(1<<30),
                x : data.readInt32LE(4)/(1<<30),
                y : data.readInt32LE(8)/(1<<30),
                z : data.readInt32LE(12)/(1<<30)
            };
            if(!self._quaternionThrottleCount || (self._quaternionThrottleCount > self._uuids.quaternion.throttleRate)) {
                self._quaternionThrottleCount = 1;
                self._states.quaternion = quaternion;
                self._logger.info("quaternion: " + JSON.stringify(quaternion));
                dev$.publishResourceStateChange(self._deviceID, "quaternion", quaternion);
            }
            self._quaternionThrottleCount++;
        };

        this.onStepCounter = function(data) {
            var stepCounter = {
                steps : data.readUInt32LE(0),
                time : data.readUInt32LE(4)
            };
            self._states.stepcounter = stepCounter;
            self._logger.info("stepCounter: " + JSON.stringify(stepCounter));
            dev$.publishResourceStateChange(self._deviceID, "stepcounter", stepCounter);
        };

        this._eulerThrottleCount = 0;
        this.onEulerAngles = function(data) {
            var euler = {
                roll  : data.readInt32LE(0)/(1<<16),
                pitch : data.readInt32LE(4)/(1<<16),
                yaw   : data.readInt32LE(8)/(1<<16)
            };

            if(!self._eulerThrottleCount || (self._eulerThrottleCount > self._uuids.euler.throttleRate)) {
                self._eulerThrottleCount = 1;
                self._states.euler = euler;
                self._logger.info("Euler Angles: " + JSON.stringify(euler));
                dev$.publishResourceStateChange(self._deviceID, "euler", euler);
            }
            self._eulerThrottleCount++;
        };

        //Heading - http://www.chrobotics.com/library/heading-course-and-crab-angle
        this._headingThrottleCount = 0;
        this.onHeading = function(data) {
            var heading = data.readInt32LE(0)/(1<<16);
            if(!self._headingThrottleCount || (self._headingThrottleCount > self._uuids.heading.throttleRate)) {
                self._headingThrottleCount = 1;
                self._states.heading = heading;
                self._logger.info("Heading: " + JSON.stringify(heading));
                dev$.publishResourceStateChange(self._deviceID, "heading", heading);
            }
            self._headingThrottleCount++;
        };

        this._gravityThrottleCount = 0;
        this.onGravity = function(data) {
            var gravity = {
                x : data.readFloatLE(0),
                y : data.readFloatLE(4),
                z : data.readFloatLE(8)
            };
            if(!self._gravityThrottleCount || (self._gravityThrottleCount > self._uuids.gravity.throttleRate)) {
                self._gravityThrottleCount = 1;
                self._states.gravity = gravity;
                self._logger.info("Gravity: " + JSON.stringify(gravity));
                dev$.publishResourceStateChange(self._deviceID, "gravity", gravity);
            }
            self._gravityThrottleCount++;
        };

        this._accelerometerThrottleCount = 0;
        this.onAccelerometer = function(data) {
            var raw_data = {
                accelerometer : {
                    x : data.readInt16LE(0)/(1<<10),
                    y : data.readInt16LE(2)/(1<<10),
                    z : data.readInt16LE(4)/(1<<10)
                },
                gyroscope : {
                    x : data.readInt16LE(6)/(1<<5),
                    y : data.readInt16LE(8)/(1<<5),
                    z : data.readInt16LE(10)/(1<<5)
                },
                compass : {
                    x : data.readInt16LE(12)/(1<<4),
                    y : data.readInt16LE(14)/(1<<4),
                    z : data.readInt16LE(16)/(1<<4)
                },
            };

            if(!self._accelerometerThrottleCount || (self._accelerometerThrottleCount > self._uuids.accelerometer.throttleRate)) {
                self._accelerometerThrottleCount = 1;
                self._states.accelerometer = raw_data.accelerometer;
                self._logger.info("accelerometer: " + JSON.stringify(raw_data.accelerometer));
                dev$.publishResourceStateChange(self._deviceID, "accelerometer", raw_data.accelerometer);

                self._states.gyroscope = raw_data.gyroscope;
                self._logger.info("gyroscope: " + JSON.stringify(raw_data.gyroscope));
                dev$.publishResourceStateChange(self._deviceID, "gyroscope", raw_data.gyroscope);

                self._states.magnetometer = raw_data.magnetometer;
                self._logger.info("magnetometer: " + JSON.stringify(raw_data.compass));
                dev$.publishResourceStateChange(self._deviceID, "magnetometer", raw_data.compass);
            }
            self._accelerometerThrottleCount++;
        };

        this.onRotation = function(data) {
            var rotation_matrix = {
                m_11 : data.readInt16LE(0)/(1<<14),
                m_12 : data.readInt16LE(2)/(1<<14),
                m_13 : data.readInt16LE(4)/(1<<14),

                m_21 : data.readInt16LE(6)/(1<<14),
                m_22 : data.readInt16LE(8)/(1<<14),
                m_23 : data.readInt16LE(10)/(1<<14),

                m_31 : data.readInt16LE(12)/(1<<14),
                m_32 : data.readInt16LE(14)/(1<<14),
                m_33 : data.readInt16LE(16)/(1<<14)
            };

                self._states.rotation = rotation_matrix;
            self._logger.info("rotation matrix: " + JSON.stringify(rotation_matrix));
            dev$.publishResourceStateChange(self._deviceID, "rotation", rotation_matrix);
        };

        this.onNotify = {
            "temperature": this.onTemperature,
            "humidity": this.onHumidity,
            "co2": this.onCo2,
            "color": this.onColor,
            "pressure": this.onPressure,
            "button": this.onButton,
            "tap": this.onTap,
            "orientation": this.onOrientation,
            "quaternion": this.onQuaternion,
            "stepcounter": this.onStepCounter,
            "euler": this.onEulerAngles,
            "heading": this.onHeading,
            "gravity": this.onGravity,
            "accelerometer": this.onAccelerometer,
            "rotation": this.onRotation
        };

        Object.keys(this._uuids).forEach(function(st) {
            if(typeof self._uuids[st].subscribe !== 'undefined') {
                self.state.subscribe.set({[st]: self._uuids[st].subscribe});
            }
        });

        this._updateRSSI = function() {
            if(!self._isRssiRunning) {
                self._rssiInterval = setInterval(function() {
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
            self.emit('unreachable');
        });
        this._ble.removeAllListeners('connect-'+this._peripheralID);
        this._ble.on('connect-'+this._peripheralID, function() {
            self._logger.debug("Got connect event!");
            self._updateRSSI();
            self.emit('reachable');
        });
        this._logger.info("Device controller initialized successfully!");

        //This validates that device onboarded successfully
        this.state.rgb.set(this._states.rgb);
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
        battery: {
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self._ble.readCharacteristic(self._peripheralID, self._uuids.battery.serviceID, self._uuids.battery.characteristicID).then(function(data) {
                        resolve(data[0]);
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
                return this._states.power;
            },
            set: function(data) {
                if(data == 'on') {
                    return this.state.rgb.set(this._states.rgb);
                } else {
                    var buffer = new Buffer(1);
                    buffer.writeUInt8(0, 0);
                    return this._ble.writeCharacteristic(this._peripheralID, this._uuids.rgb.serviceID, this._uuids.rgb.characteristicID, false, buffer);
                }
            }
        },
        rgb: {
            get: function() {
                return this._states.rgb;
            },
            set: function(obj) {
                //Examples-
                //devicejs> dev$.selectByID('BLE_Thingy_c986aac44698').set("rgb", {"mode": "oneshot", "data": {"color": 7, "intensity": 40, "delay": 3500}})
                // { BLE_Thingy_c986aac44698: { receivedResponse: true, response: { error: null } } }
                // devicejs> dev$.selectByID('BLE_Thingy_c986aac44698').set("rgb", {"mode": "breathe", "data": {"color": 7, "intensity": 40, "delay": 3500}})
                // { BLE_Thingy_c986aac44698: { receivedResponse: true, response: { error: null } } }
                // devicejs> dev$.selectByID('BLE_Thingy_c986aac44698').set("rgb", {"mode": "constant", "data": {"r": 10, "g": 10, "b": 0}})
                // { BLE_Thingy_c986aac44698: { receivedResponse: true, response: { error: null } } }

                if(obj.mode == "breathe") {
                    var buffer = new Buffer(5);
                    buffer.writeUInt8(2, 0);
                    buffer.writeUInt8(obj.data.color, 1);
                    buffer.writeUInt8(obj.data.intensity, 2);
                    buffer.writeUInt16LE(obj.data.delay, 3);
                } else if(obj.mode == "oneshot") {
                    var buffer = new Buffer(3);
                    buffer.writeUInt8(3, 0);
                    buffer.writeUInt8(obj.data.color, 1);
                    buffer.writeUInt8(obj.data.intensity, 2);
                } else { //any other mode - 'constant'
                    var buffer = new Buffer(4);
                    buffer.writeUInt8(1, 0);
                    buffer.writeUInt8(obj.data.r, 1);
                    buffer.writeUInt8(obj.data.g, 2);
                    buffer.writeUInt8(obj.data.b, 3);
                }

                this._states.rgb = obj;
                return this._ble.writeCharacteristic(this._peripheralID, this._uuids.rgb.serviceID, this._uuids.rgb.characteristicID, false, buffer);
            }
        },
        rotation: {
            get: function() {
                return this._states.rotation;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        gravity: {
            get: function() {
                return this._states.gravity;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        accelerometer: {
            get: function() {
                return this._states.accelerometer;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        gyroscope: {
            get: function() {
                return this._states.gyroscope;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        magnetometer: {
            get: function() {
                return this._states.magnetometer;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        heading: {
            get: function() {
                return this._states.heading;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        euler: {
            get: function() {
                return this._states.euler;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        stepcounter: {
            get: function() {
                return this._states.stepCounter;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        quaternion: {
            get: function() {
                return this._states.quaternion;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        orientation: {
            get: function() {
                return this._states.orientation;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        tap: {
            get: function() {
                return this._states.tap;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        button: {
            get: function() {
                return this._states.button;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        temperature: {
            get: function() {
                return this._states.temperature;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        humidity: {
            get: function() {
                return this._states.humidity;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        co2: {
            get: function() {
                return this._states.co2;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        tvoc: {
            get: function() {
                return this._states.tvoc;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        color: {
            get: function() {
                return this._states.color;
            },
            set: function() {
                return Promise.reject('Readonly facade!');
            }
        },
        pressure: {
            get: function() {
                return this._states.pressure;
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
                            if(typeof self._states.subscribe[st] == 'undefined' || input[st] != self._states.subscribe[st]) {
                                p.push(
                                    self._ble.notifyCharacteristics(self._peripheralID, self._uuids[st].serviceID, self._uuids[st].characteristicID, self.onNotify[st], input[st]).then(function() {
                                        self._logger.info("Got subscription request for state=" + st + ", subscribe=" + input[st]);
                                        self._states.subscribe[st] = input[st];
                                    })
                                );
                            }
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
    /*devicejs> dev$.selectByID('BLE_Thingy_c986aac44698').get().then(function(a) { console.log(a.BLE_Thingy_c986aac44698.response) })
        { result:
           { temperature: 30.47,
             humidity: 74,
             co2: 400,
             tvoc: 0,
             color: { red: 2398, green: 2567, blue: 2909, clear: 447 },
             pressure: 982.74,
             button: true,
             quaternion:
              { w: 0.9996950617060065,
                x: -0.005753546953201294,
                y: 0.001343398354947567,
                z: -0.023978350684046745 },
             euler:
              { roll: -0.662811279296875,
                pitch: 0.138092041015625,
                yaw: -2.747222900390625 },
             heading: 357.2527770996094,
             gyroscope: { x: 0.03125, y: -0.125, z: -0.15625 },
             accelerometer: { x: -0.001953125, y: -0.0166015625, z: 0.9794921875 },
             gravity:
              { x: -0.02364274114370346,
                y: -0.11357494443655014,
                z: 9.805901527404785 },
             rotation:
              { m_11: 0.99884033203125,
                m_12: 0.04791259765625,
                m_13: 0.0029296875,
                m_21: -0.0479736328125,
                m_22: 0.998779296875,
                m_23: 0.01141357421875,
                m_31: -0.00244140625,
                m_32: -0.0115966796875,
                m_33: 0.9998779296875 },
             rgb: { r: 0, g: 10, b: 10 },
             rssi: -59,
             battery: 79 },
          error: null }
     */
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

module.exports = Thingy;
