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

var CREE_Connected_A19_60W_Equivalent = {
    start: function(options) {
        var self = this;
        self.logger = new Logger( {moduleName: 'CREE_Connected_A19_60W_Equivalent' + options.nodeId, color: 'blue'} );
        self.logger.info('starting controller');

        this.nodeId = options.nodeId;
        this.znpController = options.znpController;
        this.interfaces = options.interfaces;
        this.endPoint = options.endPoint;
        this.multiplexer = options.multiplexer;

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
                self.emit('reachable');
            }
            else {
                self.logger.info(self.nodeId + ' unreachable, went offline');
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
            get: function() {
                return this.cluster_classes["on_off"].get();
            },
            set: function(value) {
                return this.cluster_classes["on_off"].set(value);
            }
        },
        brightness: {
            get: function() {
                return this.cluster_classes["level"].get();
            },
            set: function(value) {
                if(value > 0) {
                    this.state.power.set('on');
                }
                return this.cluster_classes["level"].set(value);
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
            }).catch(function(e) {
                self.logger.error('Failed to get power state ' + e + JSON.stringify(e));
                resolve();
            })
        })


        var p2 = new Promise(function(resolve, reject) {
            self.state.brightness.get().then(function(value) {
                if(value != null)
                    s['brightness'] = value;
                resolve();
            }).catch(function(e) {
                self.logger.error('Failed to get brightness state ' + e + JSON.stringify(e));
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
                        self.logger.error('This should not have happened, got key which is not returned by getstate- ' + key);
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
        metadata: function() {
            return JSON.stringify(this.znpController.nodes[this.nodeId]);
        },
        on: function() {
            return this.state.power.set('on');
        },
        off: function() {
            return this.state.power.set('off');
        }
    }
};

module.exports = dev$.resource("Core/Devices/Lighting/ZigbeeHA/CREE_Connected_A19_60W_Equivalent", CREE_Connected_A19_60W_Equivalent);