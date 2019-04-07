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

var MultiSensor = {
    start: function(options) {
        var self = this;
        this._logger = new Logger( {moduleName: options.id, color: 'green'} );
        this._logger.debug('starting controller');
        this._resourceID = options.id;
        this._supportedStates = options.supportedStates;

        //"reachable" event
        self.emit('reachable');
        this._states = {
            motion: true,
            tamper: false,
            luminance: 45,
            temperature: 75,
            ultraviolet: 44,
            battery: 88
        };
        if( (options.initialState && options.initialState.state) ) {
            this._states.motion = options.initialState.state.motion || this._states.motion;
            this._states.tamper = options.initialState.state.tamper || this._states.tamper;
            this._states.luminance = options.initialState.state.luminance || this._states.luminance;
            this._states.temperature = options.initialState.state.temperature || this._states.temperature;
            this._states.ultraviolet = options.initialState.state.ultraviolet || this._states.ultraviolet;
            this._states.battery = options.initialState.state.battery || this._states.battery;
        }
    },
    stop: function() {
    },
    state: {
        motion: {
            get: function() {
                return Promise.resolve(this._states.motion);
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        tamper: {
            get: function() {
                return Promise.resolve(this._states.tamper);
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        battery: {
            get: function() {
                return Promise.resolve(this._states.battery);
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        ultraviolet: {
            get: function() {
                return Promise.resolve(this._states.ultraviolet);
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        luminance: {
            get: function() {
                return Promise.resolve(this._states.luminance);
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        temperature: {
            get: function() {
                return Promise.resolve(this._states.temperature);
            },
            set: function(value) {
                this._temperature = value;
                return Promise.resolve();
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
            this._states.motion = ((parseInt(Math.random() * 100) > 50) ? true : false);
            this.emit('motion', this._states.motion);
            // dev$.publishResourceStateChange(this._resourceID, 'motion', this._states.motion);

            this._states.tamper = ((parseInt(Math.random() * 100) > 50) ? true : false);
            this.emit('tamper', this._states.tamper);
            // dev$.publishResourceStateChange(this._resourceID, 'tamper', this._states.tamper);

            this._states.battery = (parseInt(Math.random() * 100));
            dev$.publishResourceStateChange(this._resourceID, 'battery', this._states.battery);

            this._states.temperature = (parseInt(Math.random() * 100));
            dev$.publishResourceStateChange(this._resourceID, 'temperature', this._states.temperature);

            this._states.luminance = (parseInt(Math.random() * 100));
            dev$.publishResourceStateChange(this._resourceID, 'luminance', this._states.luminance);

            this._states.ultraviolet = (parseInt(Math.random() * 100));
            dev$.publishResourceStateChange(this._resourceID, 'ultraviolet', this._states.ultraviolet);

            return Promise.resolve('Multisensor state changed to ' + JSON.stringify(this._states));
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

module.exports = dev$.resource('Core/Devices/Virtual/MultiSensor', MultiSensor);