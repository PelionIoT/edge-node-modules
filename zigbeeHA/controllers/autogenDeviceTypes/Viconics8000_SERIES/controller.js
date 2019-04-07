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
var logger = null;

function applySchema(devjsSchema, data) {
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

var Viconics8000_SERIES = {
    start: function(options) {
        logger = new Logger( {moduleName: 'Viconics8000_SERIES' + options.nodeId, color: 'blue'} );
        logger.info('starting controller');
        var self = this;

        this.nodeId = options.nodeId;
        this.znpController = options.znpController;
        this.interfaces = options.interfaces;
        this.endPoint = options.endPoint;
        this.multiplexer = options.multiplexer;
        this.attributes = {};
        this.deviceConfiguration = {};

        this.cluster_classes = [];
        this.events = [];

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
                        logger.info(self.nodeId + ' events: ' + JSON.stringify(self.events[c.id]));
                    } else {
                        logger.error(self.nodeId + ' No devjs interface found for command class: ' + c.name);
                    }
                } else {
                    //No interface assigned to the class
                }
            } else {
                logger.error(self.nodeId + ' devjs interfaces is not an object: ' + JSON.stringify(interfaces));
            }

            //extract attributes
            if(typeof c.attributes !== 'undefined') {
                self.attributes[c.name] = c.attributes;
                Object.keys(c.attributes).forEach(function(i) {
                    self.deviceConfiguration[c.id + c.attributes[i].attrId] = c.attributes[i];
                })
            }
        });

        //Listen for events
        this.znpController.on('zigbeeHA ' + this.nodeId, function(comclass, value) {
            if(typeof self.events[comclass] !== 'undefined') {
                self.cluster_classes[self.events[comclass]['class']].report(value);
                //emit the event for other apps
                if(self.events[comclass]['event'] != '') {
                    logger.info(self.nodeId + ' saw event ' + self.events[comclass]['event'].toString().toUpperCase() + ' with value ' + value.value);

                    //apply schema
                    self.emit(self.events[comclass]['event'], applySchema(self.events[comclass]['schema'], value.value));
                } else {
                    //no event is associated to this class
                }
            } else {
                logger.warn(self.nodeId + ' saw event from class ' + comclass + ' which is not yet supported');
            }
        });
        
        //"reachable" event
        this.znpController.on('reachable ' + this.nodeId, function(value) {
            if(value){
                logger.info(self.nodeId + ' reachable, came online');

                /**
                * Fired when a device is online
                *
                * @event reachable
                */
                self.emit('reachable');
            }
            else {
                logger.info(self.nodeId + ' unreachable, went offline');

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
                return this.cluster_classes["thermostat"].get(0x001c);
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
        setCoolTemperatureLevel: {
            /**
             * Get setCoolTemperatureLevel of the device
             * 
             * Usage: dev$.select('id=*').get('setCoolTemperatureLevel');
             *
             * @method setCoolTemperatureLevel get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place
             */
            get: function() {
                //cool - 0x0011, heat - 0x0012 attribute ids
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(0x0011).then(function(coolRsp) {
                        resolve(coolRsp)
                    }, function(err) {
                        logger.error('Could not get cool setpoint- ' + JSON.stringify(err));
                        reject(err);
                    });
                })
            },
            /**
             * Set setCoolTemperatureLevel of the device
             * 
             * Usage: dev$.select('id=*').set('setCoolTemperatureLevel', 76);
             *
             * @method setCoolTemperatureLevel set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object. 
             */
            set: function(value) {
                return this.cluster_classes["thermostat"].setTemperatureLevel('cool', value);
            }
        },
        setHeatTemperatureLevel: {
            /**
             * Get setHeatTemperatureLevel of the device
             * 
             * Usage: dev$.select('id=*').get('setHeatTemperatureLevel');
             *
             * @method setHeatTemperatureLevel get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place 
             */
            get: function() {
                //cool - 0x0011, heat - 0x0012 attribute ids
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(0x0012).then(function(heatRsp) {
                        resolve(heatRsp);
                    }, function(err) {
                        logger.error('Could not get heat setpoint- ' + JSON.stringify(err));
                        reject(err);
                    });
                })
            },
            /**
             * Set setHeatTemperatureLevel of the device
             * 
             * Usage: dev$.select('id=*').set('setHeatTemperatureLevel', 76);
             *
             * @method setHeatTemperatureLevel set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object. 
             */
            set: function(value) {
                return this.cluster_classes["thermostat"].setTemperatureLevel('heat', value);
            }
        },
        setAutoTemperatureLevel: {
            /**
             * Get setAutoTemperatureLevel of the device
             * 
             * Usage: dev$.select('id=*').get('setAutoTemperatureLevel');
             *
             * @method setAutoTemperatureLevel get
             * @return {Number} return temperature level in fahrenheit upto 2 decimal place 
             */
            get: function() {
                //cool - 0x0011, heat - 0x0012 attribute ids
                var self = this;
                return new Promise(function(resolve, reject) {
                    self.cluster_classes["thermostat"].get(0x0011).then(function(coolRsp) {
                        // logger.info('Got coolRsp- ' + coolRsp);
                        self.cluster_classes["thermostat"].get(0x0012).then(function(heatRsp) {
                            // logger.info('Got heatRsp- ' + heatRsp);
                            resolve({'cool': coolRsp, 'heat': heatRsp});
                        }, function(err) {
                            logger.error('Could not get heat setpoint- ' + JSON.stringify(err));
                            reject(err);
                        });
                    }, function(err) {
                        logger.error('Could not get cool setpoint- ' + JSON.stringify(err));
                        reject(err);
                    });
                })
            },
            /**
             * Set setAutoTemperatureLevel of the device
             * 
             * Usage: dev$.select('id=*').set('setAutoTemperatureLevel', 76);
             *
             * @method setAutoTemperatureLevel set
             * @param {Number} value takes temperature level in fahrenheit
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object. 
             */
            set: function(value) {
                return this.cluster_classes["thermostat"].setTemperatureLevel('auto', value);
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
                return this.cluster_classes["temperature"].get();
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
        thermostatUserInterface: {
            /**
             * Get thermostatUserInterface of the device
             * 
             * Usage: dev$.select('id=*').get('thermostatUserInterface');
             *
             * @method thermostatUserInterface get
             * @return {Number} return temperatureDisplayMode attribute 0x0000 value-- 0=celcius, 1=fahrenheit
             */
            get: function() {
                return this.cluster_classes["thermostatUserInterface"].get();
            },
            /**
             * Set thermostatUserInterface of the device
             * 
             * Usage: dev$.select('id=*').set('thermostatUserInterface', {attrId: 0x0001, value: 0x02});
             *
             * @method thermostatUserInterface set
             * @param {Object} value attrid: 0x0000 (temperatureDisplayMode), value: 0 (celcius), 1 (fahrenheit); 
             * attrid: 0x0001 (keypadLockout), value: 0: noLockout, 1: level1Lockout, 2: level2Lockout, 3: level3Lockout, 4: level4Lockout, 5: level5Lockout
             * @return {Promise} The success handler accepts no parameter. The failure
             *  handler accepts a single error object. 
             */
            set: function(value) {
                return this.cluster_classes["thermostatUserInterface"].set(value);
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
                return this.cluster_classes["fan_control"].get();
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
        }
    },
    getState: function() {
        var s = {}
        var self = this;

        var p1 = new Promise(function(resolve, reject) {
            self.state.power.get().then(function(value) {
                if(value != null)
                    s['power'] = value;
                resolve();
            })
        })


        var p2 = new Promise(function(resolve, reject) {
            self.state.brightness.get().then(function(value) {
                if(value != null)
                    s['brightness'] = value;
                resolve();
            })
        })

        return Promise.all([p1, p2]).then(function() {
            return s;
        });
    },
    setState: function(value) {
        var self = this;

        var p = [];

        return new Promise(function(resolve, reject) {

            self.getState().then(function(obj) {
                Object.keys(value).forEach(function(key) {
                    if(typeof obj[key] != 'undefined') {
                        if(JSON.stringify(obj[key]) != JSON.stringify(value[key])) {
                            p.push(self.state[key].set(value[key]));
                        }
                    } else {
                        logger.error('This should not have happened, got key which is not returned by getstate- ' + key);
                    }
                });

                Promise.all(p).then(function() {
                    resolve();
                }, function(err) {
                    reject(err);
                });
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
         * Get attribute value of thermostat cluster
         * 
         * Usage: dev$.select('id=*').call('getAttribute', 0x001c);
         *
         * @method getAttribute
         * @param {Number} attrId 2 byte number, refer ZCL document to know the attribute Ids
         * @return {Promise} The success handler accepts no parameter. The failure
         *  handler accepts a single error object. 
         */
        getAttribute: function(attrId) {
            return this.cluster_classes['thermostat'].get(attrId);
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
            // logger.info('Got attributes- ' + JSON.stringify(attributes));
            return new Promise(function(resolve, reject) {
                var p = [];
                Object.keys(self.attributes).forEach(function(clusterId) {
                    // logger.info('calling attribute- ' + id);
                    Object.keys(self.attributes[clusterId]).forEach(function(attrId) {
                        p.push(self.cluster_classes[clusterId].get(attrId/1, true));
                    })
                })

                Promise.all(p).then(function(attrResponse){
                    logger.info('Got response- ' + JSON.stringify(attrResponse));
                    attrResponse.forEach(function(resp) {
                        logger.trace('got value- '+ JSON.stringify(resp));
                        // logger.info('clusterClass- ' + DEFINES.CLUSTER_CLASS_ID[value.clusterClass]);
                        if(self.deviceConfiguration[resp.clusterClass + resp.attrId].operation.length != 0 && (typeof resp.value === 'number')) {
                            resp.value = self.znpController.evalOperation(resp.value, self.deviceConfiguration[resp.clusterClass + resp.attrId].operation);
                        }
                        self.deviceConfiguration[resp.clusterClass + resp.attrId] = Object.assign(self.deviceConfiguration[resp.clusterClass + resp.attrId], resp);
                    })
                    resolve(self.deviceConfiguration);
                })
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
        getConfiguration: function() {
            return this.commands.getAllAttributes();
        },
        getLocalConfiguration: function() {
            return this.deviceConfiguration;
        },
        setConfiguration: function() {
            return new Error('Not yet implemented');
        },
        setAttribute: function(clustId, attrId) {
            return this.cluster_classes[clustId].set(attrId);
        }
    }
};

module.exports = dev$.resource("Core/Devices/Lighting/AutogenZigbeeHA/Viconics8000_SERIES", Viconics8000_SERIES);