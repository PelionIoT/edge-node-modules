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
var Logger = require('./../../utils/logger');

var Thermostat = {
    start: function(options) {
        this._logger = new Logger( {moduleName: options.id, color: 'green'} );
        this._logger.debug('starting controller');
        this._resourceID = options.id;
        this._supportedStates = options.supportedStates;

        //"reachable" event
        this.emit('reachable');

        //Default values
        this._thermostatMode = 'cool';
        this._occupiedCoolTemperatureLevel = 74;
        this._occupiedHeatTemperatureLevel = 72;
        this._unoccupiedCoolTemperatureLevel = 77;
        this._unoccupiedHeatTemperatureLevel = 66;
        this._deadband = 2;
        this._occupancyMode = 'occupied';
        this._temperature = 76.3;
        this._returnTemp = 94;
        this._supplyTemp = 72;
        this._w1Status = 'open';
        this._w2Status = 'open';
        this._y1Status = 'closed';
        this._y2Status = 'open';
        this._gStatus = 'closed';
        this._keypadLockLevel = 2;
        this._temperatureDisplayMode = 'celsius';
        this._thermostatFanMode = 'auto';
        this._thermostatModeStatus = 'STAGE1_COOLING_ON';
        this._thermostatFanStatus = 'on';

        if( (options.initialState && options.initialState.state) ) {
            this._thermostatMode = options.initialState.state.thermostatMode || 'cool';
            this._occupiedCoolTemperatureLevel = options.initialState.state.occupiedCoolTemperatureLevel || 74;
            this._occupiedHeatTemperatureLevel = options.initialState.state.occupiedHeatTemperatureLevel || 72;
            this._unoccupiedCoolTemperatureLevel = options.initialState.state.unoccupiedCoolTemperatureLevel || 77;
            this._unoccupiedHeatTemperatureLevel = options.initialState.state.unoccupiedHeatTemperatureLevel || 66;
            this._deadband = options.initialState.state.deadband || 2;
            this._occupancyMode = options.initialState.state.occupancyMode || 'occupied';
            this._temperature = options.initialState.state.temperature || 76.3;
            this._returnTemp = options.initialState.state.returnTemperature || 94;
            this._supplyTemp = options.initialState.state.supplyTemperature || 72;
            this._w1Status = options.initialState.state.w1Status || 'open';
            this._w2Status = options.initialState.state.w2Status || 'open';
            this._y1Status = options.initialState.state.y1Status || 'closed';
            this._y2Status = options.initialState.state.y2Status || 'open';
            this._gStatus = options.initialState.state.gStatus || 'closed';
            this._keypadLockLevel = options.initialState.state.keypadLockLevel || 2;
            this._temperatureDisplayMode = options.initialState.state.temperatureDisplayMode || 'celsius';
            this._thermostatFanMode = options.initialState.state.thermostatFanMode || 'auto';
            this._thermostatModeStatus = options.initialState.state.thermostatModeStatus || 'STAGE1_COOLING_ON';
            this._thermostatFanStatus = options.initialState.state.thermostatFanStatus || 'on';
        }
    },
    stop: function() {
    },
    state: {
        thermostatMode: {
            get: function() {
                return Promise.resolve(this._thermostatMode);
            },
            set: function(value) {
                if(typeof value !== 'string') {
                    return Promise.reject('Value should be of type string');
                }
                if(!/^(heat|cool|off|auto)$/.test(value)) {
                    return Promise.reject('Value should be one of the following- heat, cool, off, auto');
                }
                this._thermostatMode = value;
                return Promise.resolve('Thermostat mode set successfully');
            }
        },
        occupiedCoolTemperatureLevel: {
            get: function() {
                return Promise.resolve(this._occupiedCoolTemperatureLevel);
            },
            set: function(value) {
                if(typeof value !== 'number') {
                    return Promise.reject('Value should be of type number');
                }
                this._occupiedCoolTemperatureLevel = value;
                return Promise.resolve('OccupiedCoolTemperatureLevel set successfully');
            }
        },
        occupiedHeatTemperatureLevel: {
            get: function() {
                return Promise.resolve(this._occupiedHeatTemperatureLevel);
            },
            set: function(value) {
                if(typeof value !== 'number') {
                    return Promise.reject('Value should be of type number');
                }
                this._occupiedHeatTemperatureLevel = value;
                return Promise.resolve('OccupiedHeatTemperatureLevel set successfully');
            }
        },
        unoccupiedCoolTemperatureLevel: {
            get: function() {
                return Promise.resolve(this._unoccupiedCoolTemperatureLevel);
            },
            set: function(value) {
                if(typeof value !== 'number') {
                    return Promise.reject('Value should be of type number');
                }
                this._unoccupiedCoolTemperatureLevel = value;
                return Promise.resolve('UnoccupiedCoolTemperatureLevel set successfully');
            }
        },
        unoccupiedHeatTemperatureLevel: {
            get: function() {
                return Promise.resolve(this._unoccupiedHeatTemperatureLevel);
            },
            set: function(value) {
                if(typeof value !== 'number') {
                    return Promise.reject('Value should be of type number');
                }
                this._unoccupiedHeatTemperatureLevel = value;
                return Promise.resolve('UnoccupiedHeatTemperatureLevel set successfully');
            }
        },
        occupiedAutoTemperatureLevel: {
            get: function() {
                return Promise.resolve({
                    occupiedCool: this._occupiedCoolTemperatureLevel,
                    occupiedHeat: this._occupiedHeatTemperatureLevel
                });
            },
            set: function(value) {
                var self = this;
                if(typeof value !== 'object') {
                    return new Error('Input value should be of object type, usage- {occupiedCool: 76, occupiedHeat: 74}');
                }
                if(typeof value.occupiedHeat === 'undefined' && typeof value.occupiedCool === 'undefined') {
                    return new Error('Unknow object properties, usage- {occupiedCool: 76, occupiedHeat: 74}');
                }
                if(typeof value.occupiedCool !== 'undefined') {
                    this._occupiedCoolTemperatureLevel = value.occupiedCool;
                }
                if(typeof value.occupiedHeat !== 'undefined') {
                    this._occupiedHeatTemperatureLevel = value.occupiedHeat;
                }
                return Promise.resolve('OccupiedAutoTemperatureLevel set successfully');
            }
        },
        unoccupiedAutoTemperatureLevel: {
             get: function() {
                return Promise.resolve({
                    unoccupiedCool: this._unoccupiedCoolTemperatureLevel,
                    unoccupiedHeat: this._unoccupiedHeatTemperatureLevel
                });
            },
            set: function(value) {
                var self = this;
                if(typeof value !== 'object') {
                    return new Error('Input value should be of object type, usage- {unoccupiedCool: 76, unoccupiedHeat: 74}');
                }
                if(typeof value.unoccupiedHeat === 'undefined' && typeof value.unoccupiedCool === 'undefined') {
                    return new Error('Unknow object properties, usage- {unoccupiedCool: 76, unoccupiedHeat: 74}');
                }
                if(typeof value.unoccupiedCool !== 'undefined') {
                    this._unoccupiedCoolTemperatureLevel = value.unoccupiedCool;
                }
                if(typeof value.unoccupiedHeat !== 'undefined') {
                    this._unoccupiedHeatTemperatureLevel = value.unoccupiedHeat;
                }
                return Promise.resolve('UnoccupiedAutoTemperatureLevel set successfully');
            }
        },
        deadband: {
            get: function() {
                return Promise.resolve(this._deadband);
            },
            set: function(value) {
                if(typeof value !== 'number') {
                    return Promise.reject('Value should be of type number');
                }
                this._deadband = value;
                return Promise.resolve('Deadband set successfully');
            }
        },
        occupancyMode: {
            get: function() {
                return Promise.resolve(this._occupancyMode);
            },
            set: function(value) {
                if(typeof value !== 'string') {
                    return Promise.reject('Value should be of type string');
                }
                if(!/^(occupied|unoccupied)$/.test(value)) {
                    return Promise.reject('Value should be one of the following- occupied, unoccupied');
                }
                this._occupancyMode = value;
                return Promise.resolve('OccupancyMode set successfully');
            }
        },
        temperature: {
            get: function() {
                return Promise.resolve(this._temperature);
            },
            set: function(value) {
                if(typeof value !== 'number') {
                    return Promise.reject('Value should be of type number');
                }
                this._temperature = value;
                if(this._occupancyMode == 'occupied') {
                    if(this._temperature > this._occupiedHeatTemperatureLevel && this._temperature < this._occupiedCoolTemperatureLevel) {
                        this.state.thermostatMode.set('off');
                    } else if (this._temperature > this._occupiedCoolTemperatureLevel) {
                        this.state.thermostatMode.set('cool');
                    } else if (this._temperature < this._occupiedHeatTemperatureLevel) {
                        this.state.thermostatMode.set('heat');
                    } else {

                    }
                } else if(this._occupancyMode == 'unoccupied') {
                    if(this._temperature > this._unoccupiedHeatTemperatureLevel && this._temperature < this._unoccupiedCoolTemperatureLevel) {
                        this.state.thermostatMode.set('off');
                    } else if (this._temperature > this._unoccupiedCoolTemperatureLevel) {
                        this.state.thermostatMode.set('cool');
                    } else if (this._temperature < this._unoccupiedHeatTemperatureLevel) {
                        this.state.thermostatMode.set('heat');
                    } else {

                    }
                } else {

                }
                return Promise.resolve('Temperature set successfully');
            }
        },
        keypadLockLevel: {
            get: function() {
                return Promise.resolve(this._keypadLockLevel);
            },
            set: function(value) {
                this._keypadLockLevel = value;
                return Promise.resolve();
            }
        },
        temperatureDisplayMode: {
            get: function() {
                return Promise.resolve(this._temperatureDisplayMode);
            },
            set: function(value) {
                this._temperatureDisplayMode = value;
                return Promise.resolve();
            }
        },
        w1Status: {
            get: function() {
                return Promise.resolve(this._w1Status);
            },
            set: function(value) {
                this._w1Status = value;
                return Promise.resolve();
            }
        },
        w2Status: {
            get: function() {
                return Promise.resolve(this._w2Status);
            },
            set: function(value) {
                this._w2Status = value;
                return Promise.resolve();
            }
        },
        y1Status: {
            get: function() {
                return Promise.resolve(this._y1Status);
            },
            set: function(value) {
                this._y1Status = value;
                return Promise.resolve();
            }
        },
        y2Status: {
            get: function() {
                return Promise.resolve(this._y2Status);
            },
            set: function(value) {
                this._y2Status = value;
                return Promise.resolve();
            }
        },
        gStatus: {
            get: function() {
                return Promise.resolve(this._gStatus);
            },
            set: function(value) {
                this._gStatus = value;
                return Promise.resolve();
            }
        },
        supplyTemperature: {
            get: function() {
                return Promise.resolve(this._supplyTemp);
            },
            set: function(value) {
                this._supplyTemp = value;
                return Promise.resolve();
            }
        },
        returnTemperature: {
            get: function() {
                return Promise.resolve(this._returnTemp);
            },
            set: function(value) {
                this._returnTemp = value;
                return Promise.resolve();
            }
        },
        thermostatFanMode: {
            get: function() {
                return Promise.resolve(this._thermostatFanMode);
            },
            set: function(value) {
                if(typeof value !== 'string') {
                    return Promise.reject('Value should be of type string');
                }
                if(!/^(off|auto|smart)$/.test(value)) {
                    return Promise.reject('Value should be one of the following- off, auto, smart');
                }
                this._thermostatFanMode = value;
                return Promise.resolve('Thermostat fan mode set successfully');
            }
        },
        thermostatModeStatus: {
            get: function() {
                this._thermostatModeStatus = 'OFF';

                if(this._w1Status === 'open' && this._w2Status === 'open' && this._y1Status === 'open' && this._y2Status === 'open') {
                    this._thermostatModeStatus = 'OFF';
                }

                if(this._w1Status === 'closed') {
                    this._thermostatModeStatus = 'STAGE1_HEATING_ON';
                }

                if(this._w2Status === 'closed') {
                    this._thermostatModeStatus = 'STAGE2_HEATING_ON';
                }

                if(this._y1Status === 'closed') {
                    this._thermostatModeStatus = 'STAGE1_COOLING_ON';
                }

                if(this._y2Status === 'closed') {
                    this._thermostatModeStatus = 'STAGE2_COOLING_ON';
                }

                return Promise.resolve(this._thermostatModeStatus);
            },
            set: function(value) {
                if(typeof value !== 'string') {
                    return Promise.reject('Value should be of type string');
                }
                if(!/^(OFF|STAGE1_HEATING_ON|STAGE2_HEATING_ON|STAGE1_COOLING_ON|STAGE2_COOLING_ON)$/.test(value)) {
                    return Promise.reject('Value should be one of the following- OFF|STAGE1_HEATING_ON|STAGE2_HEATING_ON|STAGE1_COOLING_ON|STAGE2_COOLING_ON');
                }
                this._thermostatModeStatus = value;
                return Promise.resolve('Thermostat mode status set successfully!');
            }
        },
        thermostatFanStatus: {
            get: function() {
                if(this._gStatus === 'closed') {
                    this._thermostatFanStatus = 'on';
                } else {
                    this._thermostatFanStatus = 'off';
                }
                return Promise.resolve(this._thermostatFanStatus);
            },
            set: function(value) {
                if(typeof value !== 'string') {
                    return Promise.reject('Value should be of type string');
                }
                if(!/^(on|off)$/.test(value)) {
                    return Promise.reject('Value should be one of the following- on, off');
                }
                this._thermostatFanStatus = value;
                return Promise.resolve('Thermostat fan status set successfully!');
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
                            self._logger.debug('Got state ' + type + ' value ' + value);
                            if(value !== null) {
                                s[type] = value;
                            }
                            resolve();
                        }).catch(function(e) {
                            self._logger.trace('Get state failed for type ' + type + ' ' + e);
                            s[type] = e;
                            rejected = true;
                            resolve();
                        });
                    })
                );
            });

            Promise.all(p).then(function() {
                self._logger.debug('Got device state ' + JSON.stringify(s));
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
                                self._logger.trace('Got result ' + result + ' for key ' + key);
                                s[key] = (result === undefined) ? 'Updated successfully to value ' + value[key] : result;
                                resolve();
                            }).catch(function(e) {
                                self._logger.error(key + ' got error- ' + e);
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
                self._logger.debug('Resolving set state with data ' + JSON.stringify(s));
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
        emit: function() {
            var self = this;
            return this.getState().then(function(states) {
                return self.setState(states);
            });
        },
        reachable: function(value) {
            if(value) {
                this.emit('reachable');
            } else {
                this.emit('unreachable');
            }
        }
    }
};

module.exports = dev$.resource('Core/Devices/Virtual/Thermostat', Thermostat);