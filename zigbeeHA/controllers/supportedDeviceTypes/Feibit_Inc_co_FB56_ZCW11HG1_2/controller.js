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
var configuration = require('./zigbee.json');
var Logger = require('./../../../utils/logger');

function applySchema(devjsSchema, data, logger) {
    var out = null;
    switch(devjsSchema.type) {
        case 'boolean':
            return (data == 0);
            break;
        case 'string':
            return data.toString();
            break;
        case 'number':
            if(data < devjsSchema.minimum) {
                data = devjsSchema.minimum;
            } else if (data > devjsSchema.maximum) {
                data = devjsSchema.maximum;
            }
            return data;
            break;
        case 'object':
            break;
        case 'array':
            break;
        case 'null':
            break;
        default:
            logger.warn('invalid schema ' + JSON.stringify(devjsSchema));
            break;
    }
    return data;
}

/**
* ZigBee device controller
*
* @class ZigBeeDeviceController
*/

var Feibit_Inc_co_FB56_ZCW11HG1_2 = {
    start: function(options) {
        var self = this;
        self.logger = new Logger( {moduleName: 'Feibit_Inc_co_FB56_ZCW11HG1_2' + options.nodeId, color: 'bgGreen'} );
        self.logger.info('starting controller');

        this.nodeId = options.nodeId;
        this.znpController = options.znpController;
        this.interfaces = options.interfaces;
        this.endPoint = options.endPoint;
        this.multiplexer = options.multiplexer;
        this.attributes = [];
        this.deviceConfiguration = {};

        this.cluster_classes = [];
        this.events = [];

        if(options.initialState && options.initialState.state) {
            if(options.initialState.state.hsl) {
                this.cluster_classes["color_control"].setLocal('hsl', options.initialState.state.hsl);
            }
            if(options.initialState.state.K) {
                this.cluster_classes["color_control"].setLocal('K', options.initialState.state.K);
            }
            if(options.initialState.state.lastColorCall) {
                this.cluster_classes["color_control"].setLocal('lastColorCall', options.initialState.state.lastColorCall);
            }
        }

        var interfaces = this.interfaces;

        //Instantiate classes
        configuration.cluster_classes.forEach(function(c) {
            var module = require(c.path);
            self.cluster_classes[c.name] = new module(options);

            //map the class to event, reverse indexing
            self.events[c.id] = {
                event: '',
                class: 0,
                schema: {}
            }

            //extract the schema info
            self.events[c.id]['class'] = c.name;
            if(typeof interfaces == 'object') {
                if(typeof c.interface != 'undefined') {
                    if(interfaces[c.interface]) {
                        //TODO: remove hardcoded version, also find a better way then Object.keys
                        self.events[c.id]['event'] = Object.keys(interfaces[c.interface]['0.0.1'].state);
                        self.events[c.id]['schema'] = interfaces[c.interface]['0.0.1'].state[self.events[c.id]['event']].schema;
                        self.logger.info(self.nodeId + ' events: ' + JSON.stringify(self.events[c.id]));
                    } else {
                        self.logger.error(self.nodeId + ' No devjs interface found for command class: ' + c.name);
                    }
                } else {
                    //No interface assigned to the class
                }
            } else {
                self.logger.error(self.nodeId + ' devjs interfaces is not an object: ' + JSON.stringify(interfaces));
            }

             //extract attributes
            if(typeof c.attributes !== 'undefined') {
                Object.keys(c.attributes).forEach(function(i) {
                    self.attributes.push({clusterId: c.name, id: c.attributes[i].attrId});
                    self.deviceConfiguration[c.id + c.attributes[i].attrId] = c.attributes[i];
                })
            }
            // self.commands.pollDeviceConfiguration();
        });

        //Listen for events
        this.znpController.on('zigbeeHA ' + this.nodeId, function(comclass, value) {
            if(typeof self.events[comclass] !== 'undefined') {
                self.cluster_classes[self.events[comclass]['class']].report(value);
                //emit the event for other apps
                if(self.events[comclass]['event'] != '') {
                    self.logger.info(self.nodeId + ' saw event ' + self.events[comclass]['event'].toString().toUpperCase() + ' with value ' + value.value);

                    //apply schema
                    self.emit(self.events[comclass]['event'], applySchema(self.events[comclass]['schema'], value.value, self.logger));
                } else {
                    //no event is associated to this class
                }
            } else {
                self.logger.warn(self.nodeId + ' saw event from class ' + comclass + ' which is not yet supported');
            }
        });

        //"reachable" event
        this.znpController.on('reachable ' + this.nodeId, function(value) {
            if(value){
                self.logger.info(self.nodeId + ' reachable, came online');

                /**
                * Fired when a device is online
                *
                * @event reachable
                */
                self.emit('reachable');
            }
            else {
                self.logger.info(self.nodeId + ' unreachable, went offline');

                /**
                * Fired when a device is offline
                *
                * @event unreachable
                */
                self.emit('unreachable')
            }
        });
    },
    stop: function() {
        this.znpController.removeAllListeners('reachable ' + this.nodeId);
        this.znpController.removeAllListeners('zigbeeHA ' + this.nodeId);
    },
    state: {
        power: {
            /**
             * Get power state of the device
             *
             * Usage: dev$.select('id=*').get('power');
             *
             * @method power get
             * @return {String} return power state 'off' or 'on'
             */
            get: function() {
                return this.cluster_classes["on_off"].get();
            },
            /**
             * Set power state of the device
             *
             * Usage: dev$.select('id=*').set('power', 'on');
             *
             * @method power set
             * @param {String} value power state 'on' or 'off'
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                return this.cluster_classes["on_off"].set(value);
            }
        },
        brightness: {
            /**
             * Get brightness state of the device
             *
             * Usage: dev$.select('id=*').get('brightness');
             *
             * @method brightness get
             * @return {Number} return value between 0-1
             */
            get: function() {
                return this.cluster_classes["level"].get();
            },
            /**
             * Set brightness state of the device
             *
             * Usage: dev$.select('id=*').set('brightness', 0.3);
             *
             * @method brightness set
             * @param {String} value takes in value between 0-1
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                return this.cluster_classes["level"].set(value);
            }
        },
        K: {
            /**
             * Get color temperature state of the device
             *
             * Usage: dev$.select('id=*').get('K');
             *
             * @method K get
             * @return {Number} return color temperature between 2000-8000
             */
            get: function() {
                return this.cluster_classes["color_control"].get('K');
            },
            /**
             * Set color temperature of the device
             *
             * Usage: dev$.select('id=*').set('K', 3000);
             *
             * @method K set
             * @param {Number} value takes value between 2000-8000
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                var v = {}
                v.temp = value;
                return this.cluster_classes["color_control"].set(v);
            }
        },
        hsl: {
            /**
             * Get hsl state of the device
             *
             * Usage: dev$.select('id=*').get('hsl');
             *
             * @method hsl get
             * @return {Object} return an object with h, s, l values
             */
            get: function() {
                return this.cluster_classes["color_control"].get('hsl');
            },
            /**
             * Set hsl state of the device
             *
             * Usage: dev$.select('id=*').set('hsl', {h:0.2, s:1, l:0.5});
             *
             * @method hsl set
             * @param {Object} value takes in an object with h, s, l keys
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                return this.cluster_classes["color_control"].set(value);
            }
        },
        lastColorCall: {
            /**
             * Get lastColorCall state of the device
             *
             * Usage: dev$.select('id=*').get('lastColorCall');
             *
             * @method lastColorCall get
             * @return {Object} return a string with either colorTemp or hsl
             */
            get: function() {
                return this.cluster_classes["color_control"].get('lastColorCall');
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        thermostatMode: { //WEIRD THERMOSTAT- Probably ZCL Version is very old--- 0 OFF, 1 AUTO, 2 COOL, 3 HEAT
            /**
             * Get thermostatMode of the device
             *
             * Usage: dev$.select('id=*').get('thermostatMode');
             *
             * @method thermostatMode get
             * @return {String} return thermostatMode off, auto, cool or heat
             */
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(0x001c).then(function(resp) {
                        if(self._thermostatMode != resp) {
                            self.emit('thermostatMode', resp);
                        }
                        self._thermostatMode = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            /**
             * Set thermostatMode of the device
             *
             * Usage: dev$.select('id=*').set('thermostatMode', 'cool');
             *
             * @method thermostatMode set
             * @param {String} value thermostat mode- cool, heat, auto, off
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                return this.cluster_classes["thermostat"].setMode(value);
            }
        },
        occupiedCoolTemperatureLevel: {
            /**
             * Get occupiedCoolTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').get('occupiedCoolTemperatureLevel');
             *
             * @method occupiedCoolTemperatureLevel get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place
             */
             get: function(src) {
                //cool - 0x0011, heat - 0x0012 attribute ids
                //You should not be allowed to set cold level below heat { cool: 90, heat: 88 }
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(0x0011, false, src).then(function(coolRsp) {
                        if(self._coolTemperature != coolRsp) {
                            self.emit('occupiedCoolTemperatureLevel', coolRsp);
                        }
                        self._coolTemperature = coolRsp;
                        // self.emit('occupiedCoolTemperatureLevel', coolRsp);
                        resolve(coolRsp);
                    }, function(err) {
                        self.logger.error('Could not get cool setpoint- ' + err);
                        reject(err);
                    });
                })
            },
            /**
             * Set occupiedCoolTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').set('occupiedCoolTemperatureLevel', 76);
             *
             * @method occupiedCoolTemperatureLevel set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                var self = this;
                if(self.autoTemperatureTimeout) clearTimeout(self.autoTemperatureTimeout);
                return self.cluster_classes["thermostat"].setTemperatureLevel('cool', value).then(function() {
                    self.autoTemperatureTimeout = setTimeout(function() {
                        self.commands.getAllRelayStatus();
                        // self.state.autoTemperatureLevel.get().then(function() {
                        //     if(value <= self._heatTemperature) {
                        //         self.logger.info('Apply deadband as cool temperature is less than heat');
                        //         self.state.deadband.get().then(function(db) { //get deadband
                        //             if(db) {
                        //                 self.logger.debug('Applying deadband ' + db + ' to heat, setting to value ' + (value - db));
                        //                 self.state.heatTemperatureLevel.set(value - db);
                        //             }
                        //         });
                        //     }
                        // });
                    }, 5000);
                });
            }
        },
        occupiedHeatTemperatureLevel: {
            /**
             * Get occupiedHeatTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').get('occupiedHeatTemperatureLevel');
             *
             * @method occupiedHeatTemperatureLevel get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place
             */
            get: function(src) {
                //cool - 0x0011, heat - 0x0012 attribute ids
                //You should not be allowed to set heat level above cold { cool: 90, heat: 88 }
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(0x0012, false, src).then(function(heatRsp) {
                        if(self._heatTemperature != heatRsp) {
                            self.emit('occupiedHeatTemperatureLevel', heatRsp);
                        }
                        self._heatTemperature = heatRsp;
                        // self.emit('occupiedHeatTemperatureLevel', heatRsp);
                        resolve(heatRsp);
                    }, function(err) {
                        self.logger.error('Could not get heat setpoint- ' + err);
                        reject(err);
                    });
                })
            },
            /**
             * Set occupiedHeatTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').set('occupiedHeatTemperatureLevel', 76);
             *
             * @method occupiedHeatTemperatureLevel set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                var self = this;
                if(self.autoTemperatureTimeout) clearTimeout(self.autoTemperatureTimeout);
                return self.cluster_classes["thermostat"].setTemperatureLevel('heat', value).then(function() {
                    self.autoTemperatureTimeout = setTimeout(function() {
                        self.commands.getAllRelayStatus();
                        // self.state.autoTemperatureLevel.get().then(function() {
                        //     if(value > self._coolTemperature) {
                        //         self.logger.info('Apply deadband as cool temperature is less than heat');
                        //         self.state.deadband.get().then(function(db) { //get deadband
                        //             if(db) {
                        //                 self.logger.debug('Applying deadband ' + db + ' to cool, setting to value ' + (value + db));
                        //                 self.state.coolTemperatureLevel.set(value + db);
                        //             }
                        //         });
                        //     }
                        // });
                    }, 5000);
                });
            }
        },
        coolTemperatureLevel: {
            get: function(src) {
                return this.state.occupiedCoolTemperatureLevel.get(src);
            },
            set: function(value) {
                return this.state.occupiedCoolTemperatureLevel.set(value);
            }
        },
        heatTemperatureLevel: {
            get: function(src) {
                return this.state.occupiedHeatTemperatureLevel.get(src);
            },
            set: function(value) {
                return this.state.occupiedHeatTemperatureLevel.set(value);
            }
        },
        unoccupiedCoolTemperatureLevel: {
            /**
             * Get unoccupiedCoolTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').get('unoccupiedCoolTemperatureLevel');
             *
             * @method unoccupiedCoolTemperatureLevel get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place
             */
            get: function(src) {
                //You should not be allowed to set cold level below heat { cool: 90, heat: 88 }
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(0x0013, false, src).then(function(coolRsp) {
                        if(self._unoccupiedCoolTemperature != coolRsp) {
                            self.emit('unoccupiedCoolTemperatureLevel', coolRsp);
                        }
                        self._unoccupiedCoolTemperature = coolRsp;
                        // self.emit('unoccupiedCoolTemperatureLevel', coolRsp);
                        resolve(coolRsp);
                    }, function(err) {
                        self.logger.error('Could not get unoccupied cool setpoint- ' + err);
                        reject(err);
                    });
                })
            },
            /**
             * Set unoccupiedCoolTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').set('unoccupiedCoolTemperatureLevel', 76);
             *
             * @method unoccupiedCoolTemperatureLevel set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                var self = this;
                if(self.unoccupiedAutoTemperatureTimeout) clearTimeout(self.unoccupiedAutoTemperatureTimeout);
                return self.cluster_classes["thermostat"].setTemperatureLevel('unoccupiedCool', value).then(function() {
                    self.unoccupiedAutoTemperatureTimeout = setTimeout(function() {
                        self.commands.getAllRelayStatus();
                        // self.state.unoccupiedAutoTemperatureLevel.get().then(function() {
                        //     if(value < self._unoccupiedHeatTemperature) {
                        //         self.logger.info('Apply deadband as unoccupied cool temperature is less than unoccupied heat');
                        //         self.state.deadband.get().then(function(db) { //get deadband
                        //             if(db) {
                        //                 self.logger.debug('Applying deadband ' + db + ' to unoccupied heat, setting to value ' + (value - db));
                        //                 self.state.unoccupiedHeatTemperatureLevel.set(value - db);
                        //             }
                        //         });
                        //     }
                        // });
                    }, 5000);
                });
            }
        },
        unoccupiedHeatTemperatureLevel: {
            /**
             * Get unoccupiedHeatTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').get('unoccupiedHeatTemperatureLevel');
             *
             * @method unoccupiedHeatTemperatureLevel get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place
             */
            get: function(src) {
                //cool - 0x0011, heat - 0x0012 attribute ids
                //You should not be allowed to set heat level above cold { cool: 90, heat: 88 }
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(0x0014, false, src).then(function(heatRsp) {
                        if(self._unoccupiedHeatTemperature != heatRsp) {
                            self.emit('unoccupiedHeatTemperatureLevel', heatRsp);
                        }
                        self._unoccupiedHeatTemperature = heatRsp;
                        resolve(heatRsp);
                    }, function(err) {
                        self.logger.error('Could not get heat setpoint- ' + err);
                        reject(err);
                    });
                });
            },
            /**
             * Set unoccupiedHeatTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').set('unoccupiedHeatTemperatureLevel', 76);
             *
             * @method unoccupiedHeatTemperatureLevel set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                var self = this;
                if(self.unoccupiedAutoTemperatureTimeout) clearTimeout(self.unoccupiedAutoTemperatureTimeout);
                return self.cluster_classes["thermostat"].setTemperatureLevel('unoccupiedHeat', value).then(function() {
                    self.unoccupiedAutoTemperatureTimeout = setTimeout(function() {
                        self.commands.getAllRelayStatus();
                        // self.state.unoccupiedAutoTemperatureLevel.get().then(function() {
                        //     if(value > self._coolTemperature) {
                        //         self.logger.info('Apply deadband as unoccupied cool temperature is less than unoccupied heat');
                        //         self.state.deadband.get().then(function(db) { //get deadband
                        //             if(db) {
                        //                 self.logger.debug('Applying deadband ' + db + ' to unoccupied cool, setting to value ' + (value + db));
                        //                 self.state.unoccupiedCoolTemperatureLevel.set(value + db);
                        //             }
                        //         });
                        //     }
                        // });
                    }, 5000);
                });
            }
        },
        occupiedAutoTemperatureLevel: {
            /**
             * Get occupiedAutoTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').get('occupiedAutoTemperatureLevel');
             *
             * @method occupiedAutoTemperatureLevel get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place
             */
            get: function() {
                //cool - 0x0011, heat - 0x0012 attribute ids
                //You should not be allowed to set heat level above cold { cool: 90, heat: 88 }
                //It should be set apart by deadband
                var self = this;
                return new Promise(function(resolve, reject) {
                    var p = [];
                    p.push(self.state.coolTemperatureLevel.get('auto'));
                    p.push(self.state.heatTemperatureLevel.get('auto'));

                    Promise.all(p).then(function(result) {
                        self.logger.info('Got occupiedAutoTemperatureLevel ' + JSON.stringify(result));
                        resolve({'occupiedCool': result[0], 'occupiedHeat': result[1]});  
                    }, function(err) {
                        self.logger.error('Could not get occupied cool and heat setpoint- ' + err);
                        reject(err);
                    });
                })
            },
            /**
             * Set occupiedAutoTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').set('occupiedAutoTemperatureLevel', 76);
             *
             * @method occupiedAutoTemperatureLevel set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                var self = this;
                if(typeof value !== 'object') {
                    return new Error('Input value should be of object type, usage- {occupiedCool: 76, occupiedHeat: 74}');
                }
                if(typeof value.occupiedHeat === 'undefined' && typeof value.occupiedCool === 'undefined') {
                    return new Error('Unknow object properties, usage- {occupiedCool: 76, occupiedHeat: 74}');
                }
                if(typeof value.occupiedCool !== 'undefined') {
                    return self.state.coolTemperatureLevel.set(value.occupiedCool);
                }
                if(typeof value.occupiedHeat !== 'undefined') {
                    return self.state.heatTemperatureLevel.set(value.occupiedHeat);
                }
            }
        },
        autoTemperatureLevel: {
            get: function() {
                return this.state.occupiedAutoTemperatureLevel.get();
            },
            set: function(value) {
                return this.state.occupiedAutoTemperatureLevel.set(value);
            }
        },
        unoccupiedAutoTemperatureLevel: {
            /**
             * Get unoccupiedAutoTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').get('unoccupiedAutoTemperatureLevel');
             *
             * @method unoccupiedAutoTemperatureLevel get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place
             */
            get: function() {
                //You should not be allowed to set heat level above cold { cool: 90, heat: 88 }
                //It should be set apart by deadband
                var self = this;
                return new Promise(function(resolve, reject) {
                    var p = [];
                    p.push(self.state.unoccupiedCoolTemperatureLevel.get('auto'));
                    p.push(self.state.unoccupiedHeatTemperatureLevel.get('auto'));

                    Promise.all(p).then(function(result) {
                        self.logger.info('Got unoccupiedAutoTemperatureLevel ' + JSON.stringify(result));
                        resolve({'unoccupiedCool': result[0], 'unoccupiedHeat': result[1]});  
                    }, function(err) {
                        self.logger.error('Could not get unoccupied cool and heat setpoint- ' + err);
                        reject(err);
                    });
                })
            },
            /**
             * Set unoccupiedAutoTemperatureLevel of the device
             *
             * Usage: dev$.select('id=*').set('unoccupiedAutoTemperatureLevel', 76);
             *
             * @method unoccupiedAutoTemperatureLevel set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                var self = this;
                if(typeof value !== 'object') {
                    return new Error('Input value should be of object type, usage- {unoccupiedCool: 76, unoccupiedHeat: 74}');
                }
                if(typeof value.unoccupiedHeat === 'undefined' && typeof value.unoccupiedCool === 'undefined') {
                    return new Error('Unknow object properties, usage- {unoccupiedCool: 76, unoccupiedHeat: 74}');
                }
                if(typeof value.unoccupiedCool !== 'undefined') {
                    return self.state.unoccupiedCoolTemperatureLevel.set(value.unoccupiedCool);
                }
                if(typeof value.unoccupiedHeat !== 'undefined') {
                    return self.state.unoccupiedHeatTemperatureLevel.set(value.unoccupiedHeat);
                }
            }
        },
        deadband: {
            /**
             * Get Deadband returns the minimum difference between the heat setpoint and cool setpoint
             *
             * Usage: dev$.select('id=*').get('deadband');
             *
             * @method deadband get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place
             */
            get: function() {
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(25).then(function(resp) {
                        if(self._deadband != resp) {
                            self.emit('deadband', resp);
                        }
                        self._deadband = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            /**
             * Set Deadband, a minimum difference between the heat setpoint and cool setpoint
             *
             * Usage: dev$.select('id=*').set('deadband', 2); //2 Fahrenheit difference
             *
             * @method deadband set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                var self = this;
                return self.commands.setConfiguration({attrId: 25, clusterClassId: 'thermostat', clusterClass: 513, value: value});
            }
        },
        occupancyMode: {
            /**
             * Get occupancyMode returns the occupancy mode of the thermostat
             *
             * Usage: dev$.select('id=*').get('occupancyMode');
             *
             * @method occupancyMode get
             * @return {Number} return occupancy mode either occupied or unoccupied
             */
            get: function() {
                // return this.cluster_classes["thermostat"].get(1616);
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(1616).then(function(resp) {
                        if(self._occupancyMode != resp) {
                            self.emit('occupancyMode', resp);
                        }
                        self._occupancyMode = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            /**
             * Set occupancyMode, set the occupancy mode of the thermostat
             *
             * Usage: dev$.select('id=*').set('occupancyMode', 'occupied');
             *
             * @method occupancyMode set
             * @param {String} value takes occupied or unoccupied string
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                var self = this;
                if(typeof value !== 'string') {
                    return Promise.reject('Please pass argument of type string occupied|unoccupied');
                }
                value = (value === 'unoccupied') ? 0x02 : 0x01;
                return self.commands.setConfiguration({attrId: 1616, clusterClassId: 'thermostat', clusterClass: 513, value: value});
            }
        },
        temperature: {
            /**
             * Get temperature of the device
             *
             * Usage: dev$.select('id=*').get('temperature');
             *
             * @method temperature get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place
             */
            get: function() {
                // return this.cluster_classes["temperature"].get();
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["temperature"].get().then(function(resp) {
                        if(self._temperatue != resp) {
                            self.emit('temperature', resp);
                        }
                        self._temperatue = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            /**
             * Set temperature of the device
             *
             * Usage: dev$.select('id=*').set('temperature', 76);
             *
             * @method temperature set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                return this.cluster_classes["temperature"].set(value);
            }
        },
        keypadLockLevel: {
            /**
             * Get keypadLockLevel of the device
             *
             * Usage: dev$.select('id=*').get('keypadLockLevel');
             *
             * @method keypadLockLevel get
             * @return {Number} return keypad lock level ranging 0 (No lock) to 2 (High level)
             */
            get: function() {
                return this.cluster_classes["thermostatUserInterface"].get(0x0001);
            },
            /**
             * Set keypadLockLevel of the device
             *
             * Usage: dev$.select('id=*').set('keypadLockLevel', {attrId: 0x0001, value: 0x02});
             *
             * @method keypadLockLevel set
             * @param {Object} value attrid: 0x0001 (keypadLockLevel), value: 0 or 1 or 2;
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                return this.cluster_classes["thermostatUserInterface"].set({attrId: 0x0001, value: value});
            }
        },
        temperatureDisplayMode: {
            /**
             * Get temperatureDisplayMode of the device
             *
             * Usage: dev$.select('id=*').get('temperatureDisplayMode');
             *
             * @method temperatureDisplayMode get
             * @return {Number} return temperature display mode values- 0=celcius, 1=fahrenheit
             */
            get: function() {
                return this.cluster_classes["thermostatUserInterface"].get(0x0000);
            },
            /**
             * Set temperatureDisplayMode of the device
             *
             * Usage: dev$.select('id=*').set('temperatureDisplayMode', {attrId: 0x0000, value: 'fahrenheit'});
             *
             * @method temperatureDisplayMode set
             * @param {Object} value attrid: 0x0000 (temperatureDisplayMode), value: celsius or fahrenheit;
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                return this.cluster_classes["thermostatUserInterface"].set({attrId: 0x0000, value: value});
            }
        },
        thermostatFanMode: {
            /**
             * Get thermostatFanMode of the device
             *
             * Usage: dev$.select('id=*').get('thermostatFanMode');
             *
             * @method thermostatFanMode get
             * @return {String} return fan modes-- off, low, medium, high, on, auto, smart
             */
            get: function() {
                // return this.cluster_classes["fan_control"].get();
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["fan_control"].get().then(function(resp) {
                        if(self._thermostatFanMode != resp) {
                            self.emit('thermostatFanMode', resp);
                        }
                        self._thermostatFanMode = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            /**
             * Set thermostatFanMode of the device
             *
             * Usage: dev$.select('id=*').set('thermostatFanMode', 'auto');
             *
             * @method thermostatFanMode set
             * @param {String} value takes in values-- off, low, medium, high, on, auto, smart
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object.
             */
            set: function(value) {
                return this.cluster_classes["fan_control"].set(value);
            }
        },
        humidity: {
            /**
             * Get humidity of the device
             *
             * Usage: dev$.select('id=*').get('humidity');
             *
             * @method humidity get
             * @return {Number} return 16 bit value multiply 100 gives relative humidiy
             */
            get: function() {
                return this.cluster_classes["relative_humidity"].get();
            },
            set: function(value) {
                return this.cluster_classes["relative_humidity"].set(value);
            }
        },
        motion: {
            /**
             * Get motion of the device
             *
             * Usage: dev$.select('id=*').get('motion');
             *
             * @method motion get
             * @return {Number} return 0=unoccupied, 1=occupied
             */
            get: function() {
                return this.cluster_classes["occupancy_sensor"].get();
            },
            set: function(value) {
                return this.cluster_classes["occupancy_sensor"].set(value);
            }
        },
        w1Status: {
            /**
             * Get Stage 1 heat relay status
             *
             * Usage: dev$.select('id=*').get('w1Status');
             *
             * @method w1Status get
             * @return {String} return open or closed
             */
            get: function() {
                // return this.cluster_classes["thermostat"].get(2141);
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(2141).then(function(resp) {
                        if(self._w1Status != resp) {
                            self.emit('w1Status', resp);
                        }
                        self._w1Status = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        w2Status: {
            /**
             * Get Stage 2 heat relay status
             *
             * Usage: dev$.select('id=*').get('w2Status');
             *
             * @method w2Status get
             * @return {String} return open or closed
             */
            get: function() {
                // return this.cluster_classes["thermostat"].get(2140);
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(2140).then(function(resp) {
                        if(self._w2Status != resp) {
                            self.emit('w2Status', resp);
                        }
                        self._w2Status = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        y1Status: {
            /**
             * Get Stage 1 compressor relay status
             *
             * Usage: dev$.select('id=*').get('y1Status');
             *
             * @method y1Status get
             * @return {String} return open or closed
             */
            get: function() {
                // return this.cluster_classes["thermostat"].get(2138);
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(2138).then(function(resp) {
                        if(self._y1Status != resp) {
                            self.emit('y1Status', resp);
                        }
                        self._y1Status = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        y2Status: {
            /**
             * Get Stage 2 compressor relay status
             *
             * Usage: dev$.select('id=*').get('y2Status');
             *
             * @method y2Status get
             * @return {String} return open or closed
             */
            get: function() {
                // return this.cluster_classes["thermostat"].get(2139);
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(2139).then(function(resp) {
                        if(self._y2Status != resp) {
                            self.emit('y2Status', resp);
                        }
                        self._y2Status = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        gStatus: {
            /**
             * Get fan relay status
             *
             * Usage: dev$.select('id=*').get('gStatus');
             *
             * @method gStatus get
             * @return {String} return open or closed
             */
            get: function() {
                // return this.cluster_classes["thermostat"].get(2150);
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(2150).then(function(resp) {
                        if(self._gStatus != resp) {
                            self.emit('gStatus', resp);
                        }
                        self._gStatus = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        },
        supplyTemperature: {
            /**
             * Get supply temperature, which is the temperature closest to the unit
             *
             * Usage: dev$.select('id=*').get('supplyTemperature');
             *
             * @method supplyTemperature get
             * @return {Number} return temperature in Fahrenheit
             */
            get: function() {
                // return this.cluster_classes["thermostat"].get(1898);
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(1898).then(function(resp) {
                        if(self._supplyTemperature != resp) {
                            self.emit('supplyTemperature', resp);
                        }
                        self._supplyTemperature = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }    
        },
        returnTemperature: {
            /**
             * Get return temperature, which is the temperature farthest to the unit
             *
             * Usage: dev$.select('id=*').get('returnTemperature');
             *
             * @method returnTemperature get
             * @return {Number} return temperature in Fahrenheit
             */
            get: function() {
                // return this.cluster_classes["thermostat"].get(1901);
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(1901).then(function(resp) {
                        if(self._returnTemperature != resp) {
                            self.emit('returnTemperature', resp);
                        }
                        self._returnTemperature = resp;
                        resolve(resp);
                    }, function(err) {
                        reject(err);
                    });
                });
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            } 
        }
    },
    /**
     * Get state of a device
     *
     * Usage: dev$.select('id=*').get();
     *
     * @method getState
     * @return {Object} return object with all the writable state properties
     */
    getState: function() {
        var s = {}
        var self = this;

        // var p1 = new Promise(function(resolve, reject) {
        //     self.state.power.get().then(function(value) {
        //         if(value != null)
        //             s['power'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get power state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p2 = new Promise(function(resolve, reject) {
        //     self.state.brightness.get().then(function(value) {
        //         if(value != null)
        //             s['brightness'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get brightness state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p3 = new Promise(function(resolve, reject) {
        //     self.state.K.get().then(function(value) {
        //         if(value != null)
        //             s['K'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get K state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p4 = new Promise(function(resolve, reject) {
        //     self.state.hsl.get().then(function(value) {
        //         if(value != null)
        //             s['hsl'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get hsl state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p5 = new Promise(function(resolve, reject) {
        //     self.state.thermostatMode.get().then(function(value) {
        //         if(value != null)
        //             s['thermostatMode'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get thermostatMode state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p6 = new Promise(function(resolve, reject) {
        //     self.state.occupiedCoolTemperatureLevel.get().then(function(value) {
        //         if(value != null) {
        //             s['occupiedCoolTemperatureLevel'] = value;
        //         }
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get occupiedCoolTemperatureLevel state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p7 = new Promise(function(resolve, reject) {
        //     self.state.occupiedHeatTemperatureLevel.get().then(function(value) {
        //         if(value != null) {
        //             s['occupiedHeatTemperatureLevel'] = value;
        //         }
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get occupiedHeatTemperatureLevel state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // // var p8 = new Promise(function(resolve, reject) {
        // //     self.state.occupiedAutoTemperatureLevel.get().then(function(value) {
        // //         if(value != null)
        // //             s['occupiedAutoTemperatureLevel'] = value;
        // //         resolve();
        // //     }).catch(function(e) {
        // //         self.logger.error('Failed to get occupiedAutoTemperatureLevel state ' + e + JSON.stringify(e));
        // //         resolve();
        // //     })
        // // })

        // var p9 = new Promise(function(resolve, reject) {
        //     self.state.deadband.get().then(function(value) {
        //         if(value != null)
        //             s['deadband'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get deadband state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p10 = new Promise(function(resolve, reject) {
        //     self.state.thermostatFanMode.get().then(function(value) {
        //         if(value != null)
        //             s['thermostatFanMode'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get thermostatFanMode state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p11 = new Promise(function(resolve, reject) {
        //     self.state.unoccupiedCoolTemperatureLevel.get().then(function(value) {
        //         if(value != null)
        //             s['unoccupiedCoolTemperatureLevel'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get unoccupiedCoolTemperatureLevel state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p12 = new Promise(function(resolve, reject) {
        //     self.state.unoccupiedHeatTemperatureLevel.get().then(function(value) {
        //         if(value != null)
        //             s['unoccupiedHeatTemperatureLevel'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get unoccupiedHeatTemperatureLevel state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p13 = new Promise(function(resolve, reject) {
        //     self.state.occupancyMode.get().then(function(value) {
        //         if(value != null)
        //             s['occupancyMode'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get occupancyMode state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p14 = new Promise(function(resolve, reject) {
        //     self.state.keypadLockLevel.get().then(function(value) {
        //         if(value != null)
        //             s['keypadLockLevel'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get keypadLockLevel state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p15 = new Promise(function(resolve, reject) {
        //     self.state.temperatureDisplayMode.get().then(function(value) {
        //         if(value != null)
        //             s['temperatureDisplayMode'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get temperatureDisplayMode state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // var p13 = new Promise(function(resolve, reject) {
        //     self.state.unoccupiedAutoTemperatureLevel.get().then(function(value) {
        //         if(value != null)
        //             s['unoccupiedAutoTemperatureLevel'] = value;
        //         resolve();
        //     }).catch(function(e) {
        //         self.logger.error('Failed to get unoccupiedAutoTemperatureLevel state ' + e + JSON.stringify(e));
        //         resolve();
        //     })
        // })

        // return Promise.all([p1, p2, p3, p4, p5, p6, p7, p9, p10, p11, p12, p13, p14, p15]).then(function() {
        //     return s;
        // });
        // 
        var p = [];

        Object.keys(self.state).forEach(function(type) {
            p.push(self.state[type].get().then(function(value) {
                    self.logger.info('Got state ' + type + ' value ' + value);
                    if(value != null) {
                        s[type] = value;
                    }
                }).catch(function(e) {
                    self.logger.error('Get state failed for type ' + type + ' ' + e);
                }) 
            );
        });

        return Promise.all(p).then(function() {
            return s;
        })
    },
    /**
     * Set state of a device
     *
     * Preferred way to use this method is by calling get on device controller
     * and then modifying those state properties and setting the state using this method
     *
     * Usage: dev$.select('id=*').set({power: 'on', brightness: 0.5, K: 5000});
     *
     * @method setState
     * @param {Object} getStateObject State properties object returned when called get on device controller
     * @return {Promise} The success handler accepts no parameter. The failure
     *  handler accepts a single error object.
     */
    setState: function(value) {
        var self = this;
        var s = {};
        var p = [];

        return new Promise(function(resolve, reject) {

            // self.getState().then(function(obj) {
                Object.keys(value).forEach(function(key) {
            //         if(typeof obj[key] != 'undefined') {
            //             if(JSON.stringify(obj[key]) != JSON.stringify(value[key])) {
                    if(typeof self.state[key] !== 'undefined') {
                        p.push(
                            new Promise(function(resolve, reject) {
                                self.state[key].set(value[key]).then(function(result) {
                                    self.logger.info('Got result ' + result + ' for key ' + key);
                                    s[key] = (result == undefined) ? 'Wrote successfully' : result;
                                    resolve();
                                }, function(err) {
                                    self.logger.info('Got error '+ err + key);
                                    s[key] = err;
                                    reject();
                                }).catch(function(e) {
                                    self.logger.info('Got error '+ e + key);
                                    s[key] = e;
                                    reject();
                                })
                            })
                        );
                    }
                });
                //         }
                //     } else {
                //         self.logger.error('This should not have happened, got key which is not returned by getstate- ' + key);
                //     }
                // });

                Promise.all(p).then(function(result) {
                    self.logger.info('Resolving set state with data ' + JSON.stringify(s) + ' result ' + result);
                    resolve(s);
                }, function(e) {
                    reject(e);
                });

        })
    },
    commands: {
        /**
         * Set power state to 'on' of a device
         *
         * Usage: dev$.select('id=*').call('on');
         *
         * @method on
         * @return {Promise} The success handler accepts no parameter. The failure
         *  handler accepts a single error object.
         */
        on: function() {
            return this.state.power.set('on');
        },
        /**
         * Set power state to 'off' of a device
         *
         * Usage: dev$.select('id=*').call('off');
         *
         * @method off
         * @return {Promise} The success handler accepts no parameter. The failure
         *  handler accepts a single error object.
         */
        off: function() {
            return this.state.power.set('off');
        },
        /**
         * Get the state of motion sensor
         *
         * Usage: dev$.select('id=*').call('isOccupied');
         *
         * @method isOccupied
         * @return @return {Number} return 0=unoccupied, 1=occupied
         */
        isOccupied: function() {
            return this.state.motion.get();
        },
        /**
         * Get metadata/information about the device
         *
         * Usage: dev$.select('id=*').call('metadata');
         *
         * @method metadata
         * @return @return {String} return object with device information
         */
        metadata: function() {
            return JSON.stringify(this.znpController.nodes[this.nodeId]);
        },
        /**
         * Get attribute value of thermostat cluster
         *
         * Usage: dev$.select('id=*').call('getAttribute', 0x001c);
         *
         * @method getAttribute
         * @param {Number} attrId 2 byte number, refer ZCL document to know the attribute Ids
         * @return {Promise} The success handler accepts no parameter. The failure
         *  handler accepts a single error object.
         */
        getAttribute: function(clusterId, attrId, bypass) {
            return this.cluster_classes[clusterId].get(attrId, !!bypass);
        },
        /**
         * Get all attributes values of thermostat cluster
         *
         * Usage: dev$.select('id=*').call('getAllAttributes');
         *
         * @method getAllAttributes
         * @return {Promise} The success handler accepts no parameter. The failure
         *  handler accepts a single error object.
         */
        getAllAttributes: function() {
            var self = this;

            var i = 0;
            function getNextAttribute() {
                if(i < self.attributes.length) {
                    return self.attributes[i++];
                } else {
                    // self.logger.warn('Attributes over- ' + self.attributes.length + i);
                    return null
                }
            }

            function next() {
                var attr = getNextAttribute();
                self.logger.info('Got attr ' + JSON.stringify(attr));
                if(attr != null) {
                    self.cluster_classes[attr.clusterId].get(attr.id/1, true).then(function(resp) {
                        self.logger.info('Got attr value- '+ JSON.stringify(resp));
                        if(self.deviceConfiguration[resp.clusterClass + resp.attrId].operation.length != 0 && (typeof resp.value === 'number')) {
                            resp.value = self.znpController.evalOperation(resp.value, self.deviceConfiguration[resp.clusterClass + resp.attrId].operation);
                        }

                        self.deviceConfiguration[resp.clusterClass + resp.attrId].appData = resp;

                        var obj = {};
                        obj[(resp.clusterClass + resp.attrId).toString()] = self.deviceConfiguration[resp.clusterClass + resp.attrId];
                        self.emit('configuration', JSON.stringify(obj));

                        next();
                    }, function(err) {
                        self.logger.warn('Failed to get attr ' + JSON.stringify(attr));
                        next();
                    })
                } else {
                    self.logger.info('Poll complete on ' + self.attributes.length + ' configurations');
                    return null
                }
            }

            next();
        },
        setAllAttributes: function(config) {
            var self = this;

            return new Promise(function(resolve, reject) {
                var i = 0;
                function getNextAttribute() {
                    if(i < Object.keys(config).length) {
                        return Object.keys(config)[i++];
                    } else {
                        // self.logger.warn('Attributes over- ' + self.attributes.length + i);
                        return null
                    }
                }

                function next() {
                    var id = getNextAttribute();
                    if(id != null) {
                        if(typeof config[id].appData !== 'undefined') {
                            self.commands.setConfiguration(config[id].appData).then(function() {
                                next();
                            }, function(err) {
                                return reject(err);
                            })
                        } else {
                            return reject(new Error('Could not find appData in attr ' + JSON.stringify(config[id])))
                        }
                    } else {
                        self.logger.info('setAllAttributes complete on ' + Object.keys(config).length + ' configurations');
                        return resolve();
                    }
                }

                next();
            })
        },
        getAllRelayStatus: function() {
            var p = [];
            var self = this;

            return new Promise(function(resolve, reject) {
                p.push(self.state.w1Status.get());
                p.push(self.state.w2Status.get());
                p.push(self.state.y1Status.get());
                p.push(self.state.y2Status.get());
                p.push(self.state.gStatus.get());

                Promise.all(p).then(function(resp) {
                    resolve(resp);
                }, function(err) {
                    reject(err);
                });
            })
        },
        setAllAttributesToDefault: function(config) {
            var self = this;

            return new Promise(function(resolve, reject) {
                var i = 0;
                function getNextAttribute() {
                    if(i < Object.keys(config).length) {
                        return Object.keys(config)[i++];
                    } else {
                        // self.logger.warn('Attributes over- ' + self.attributes.length + i);
                        return null
                    }
                }

                function next() {
                    var id = getNextAttribute();
                    if(id != null) {
                        if(typeof config[id].appData !== 'undefined') {
                            self.commands.setToDefault(config[id].appData).then(function() {
                                next();
                            }, function(err) {
                                return reject(err);
                            })
                        } else {
                            return reject(new Error('Could not find appData in attr ' + JSON.stringify(config[id])))
                        }
                    } else {
                        self.logger.info('setAllAttributes complete on ' + Object.keys(config).length + ' configurations');
                        return resolve();
                    }
                }

                next();
            })
        },
        /**
         * Get all device configurations
         *
         * Usage: dev$.select('id=*').call('getConfiguration');
         *
         * @method getConfiguration
         * @return {Promise} The success handler accepts no parameter. The failure
         *  handler accepts a single error object.
         */
        pollDeviceConfiguration: function() {
            return this.commands.getAllAttributes();
        },
        getConfiguration: function(appData) {
            var self = this;
            if(typeof appData === 'undefined' || typeof appData.selection !== 'undefined' || typeof appData.resourceSet !== 'undefined') {
                self.logger.info('No appData, sending all the config options');
                self.commands.pollDeviceConfiguration();
                return self.deviceConfiguration;
            } else {
                if(typeof appData.attrId === 'undefined') {
                    return Promise.reject(new Error('Please specify valid attrId ' + JSON.stringify(appData)));
                }
                if(typeof appData.clusterClassId === 'undefined') {
                    return Promise.reject(new Error('Please specify valid clusterClassId ' + JSON.stringify(appData)));
                }

                return new Promise(function(resolve, reject) {
                    self.cluster_classes[appData.clusterClassId].get(appData.attrId/1, true).then(function(resp) {
                        self.logger.info('Got attr value- '+ JSON.stringify(resp));
                        if(self.deviceConfiguration[resp.clusterClass + resp.attrId].operation.length != 0 && (typeof resp.value === 'number')) {
                            resp.value = self.znpController.evalOperation(resp.value, self.deviceConfiguration[resp.clusterClass + resp.attrId].operation);
                        }

                        self.deviceConfiguration[resp.clusterClass + resp.attrId].appData = resp;

                        var obj = {}
                        obj[(resp.clusterClass + resp.attrId).toString()] = self.deviceConfiguration[resp.clusterClass + resp.attrId];

                        self.emit('configuration', JSON.stringify(obj));
                        resolve(obj);
                    }, function(err) {
                        self.logger.error('Unable to get attribute ' + err);
                        reject(err);
                    })
                })
            }
        },
        setToDefault: function(appData) {
            var self = this;
            if(typeof appData === 'object') {
                if(typeof appData[Object.keys(appData)[0]].appData !== 'undefined') {
                    //Batch request
                    return self.commands.setAllAttributesToDefault(appData);
                } else {
                    if(typeof appData.attrId === 'undefined') {
                        return Promise.reject(new Error('Please specify valid attrId ' + JSON.stringify(appData)));
                    }
                    if(typeof appData.clusterClassId === 'undefined') {
                        return Promise.reject(new Error('Please specify valid clusterClass Identifier ' + JSON.stringify(appData)));
                    }
                    if(typeof appData.clusterClass === 'undefined') {
                        return Promise.reject(new Error('Please specify valid clusterClass ' + JSON.stringify(appData)));
                    }
                    var config = self.deviceConfiguration[appData.attrId/1 + appData.clusterClass/1];
                    if(config.access == 'r') {
                        return Promise.resolve('This attribute is read only');
                    } else {
                        if(typeof config.default !== 'undefined' || config.default != null || typeof config.default !== 'number' || config.default != '') {

                            var eVal = config.default.toFixed(2)/1;//May be we dont want to hardcode upto 2 decimal places
                            if(eVal.toString().match(config.pattern) != null) {
                                if(typeof config.outgoingOperation !== 'undefined')
                                    eVal = self.znpController.evalOperation(eVal, config.outgoingOperation);

                                return self.znpController.formatWriteAttrData(eVal, config.type).then(function(formattedData) {
                                    return self.cluster_classes[appData.clusterClassId].setAttr(appData.attrId, config.type, formattedData);
                                }, function(err) {
                                    return Promise.reject(err);
                                })
                            } else {
                                return Promise.reject(new Error('Incorrect default value, please specify value between ' + config.range + ' in unit ' + config.unit));
                            }
                        } else {
                            return Promise.reject('Default value is not defined for this attribute');
                        }
                    }
                }
            } else {
                return Promise.reject('Parameter passed should be of object type');
            }
        },
        setConfiguration: function(appData) {
            var self = this;
            if(typeof appData === 'object') {
                if(typeof appData[Object.keys(appData)[0]].appData !== 'undefined') {
                    //Batch request
                    return self.commands.setAllAttributes(appData);
                } else {
                    if(typeof appData.attrId === 'undefined') {
                        return Promise.reject(new Error('Please specify valid attrId ' + JSON.stringify(appData)));
                    }
                    if(typeof appData.clusterClassId === 'undefined') {
                        return Promise.reject(new Error('Please specify valid clusterClass Identifier ' + JSON.stringify(appData)));
                    }
                    if(typeof appData.clusterClass === 'undefined') {
                        return Promise.reject(new Error('Please specify valid clusterClass ' + JSON.stringify(appData)));
                    }
                    var config = self.deviceConfiguration[appData.attrId/1 + appData.clusterClass/1];
                    if(config.access == 'r') {
                        return Promise.resolve('This attribute is read only');
                    } else {
                        if(typeof appData.value == 'undefined') {
                            return Promise.reject(new Error('Please specify value key ' + JSON.stringify(appData)));
                        }

                        var eVal = appData.value.toFixed(2)/1;//May be we dont want to hardcode upto 2 decimal places
                        if(eVal.toString().match(config.pattern) != null) {

                            if(typeof config.outgoingOperation !== 'undefined')
                                eVal = self.znpController.evalOperation(eVal, config.outgoingOperation);

                            return self.znpController.formatWriteAttrData(eVal, config.type).then(function(formattedData) {
                                return self.cluster_classes[appData.clusterClassId].setAttr(appData.attrId, config.type, formattedData);
                            }, function(err) {
                                return Promise.reject(err);
                            })
                        } else {
                            return Promise.reject(new Error('Incorrect input value, please specify value between ' + config.range + ' in unit ' + config.unit));
                        }
                    }
                }
            } else {
                return Promise.reject('Parameter passed should be of object type');
            }
        },
        setAttribute: function(clusterClassId, attrId, type, value) {
            return this.cluster_classes[clusterClassId].setAttr(attrId, type, value);
        },
        getDeviceInformation: function() {
            return this.cluster_classes['basic'].getDeviceInformation();
        }
    }
};

module.exports = dev$.resource("Core/Devices/Lighting/AutogenZigbeeHA/Feibit_Inc_co_FB56_ZCW11HG1_2", Feibit_Inc_co_FB56_ZCW11HG1_2);