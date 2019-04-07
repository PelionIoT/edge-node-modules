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

var Ultraviolet = {
    start: function(options) {
        var self = this;
        this._logger = new Logger( {moduleName: options.id, color: 'green'} );
        this._logger.debug('starting controller');
        this._resourceID = options.id;
        this._supportedStates = options.supportedStates;

        //"reachable" event
        self.emit('reachable');
        this._ultraviolet = 56;
        if( (options.initialState && options.initialState.state) ) {
            this._ultraviolet = options.initialState.state.ultraviolet || this._ultraviolet;
        }
    },
    stop: function() {
    },
    state: {
        ultraviolet: {
            get: function() {
                return Promise.resolve(this._ultraviolet);
            },
            set: function(value) {
                return Promise.reject('Read only facade');
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
        emit: function(value) {
            if(typeof value === 'object') value = undefined;
            value = value || (parseInt(Math.random() * 100));
            this._ultraviolet = value;
            this._logger.debug('Emitting ultraviolet ' + value);
            dev$.publishResourceStateChange(this._resourceID, 'ultraviolet', value);
            return Promise.resolve('ultraviolet state changed to ' + value);
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

module.exports = dev$.resource('Core/Devices/Virtual/Ultraviolet', Ultraviolet);