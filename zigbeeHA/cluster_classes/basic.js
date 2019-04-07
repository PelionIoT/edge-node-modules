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
var EventEmitter = require('events').EventEmitter;
var DEFINES = require('./../lib/defs').DEFINES;
var Logger = require('./../utils/logger');

function Basic(options){
    var self = this;
	this.clusterClass = DEFINES.CLUSTER_CLASS.GENERAL.BASIC;
    this.znpController = options.znpController;
    this.nodeId = options.nodeId;
    this.endPoint = options.endPoint;
    this.multiplexer = options.multiplexer;
    
    self.logger = new Logger( { moduleName: 'Basic' + this.nodeId, color: 'white'} );

    // this.multiplexer.removeAllListener('attrResponse ' + this.clusterClass.toString() + this.nodeId.toString());
    // this.multiplexer.on('attrResponse ' + this.clusterClass.toString() + this.nodeId.toString(), function(info) {
    //     // log.info('Basic got attribute response: ', info);
    //     self.emit('newNodeAttrResponse ' + self.nodeId, info);
    // });

    // this.deviceInfoAttr = {
    //     ZCLVersion: 0x0000,
    //     ApplicationVersion: 0x0001,
    //     StackVersion: 0x0002,
    //     HWVersion: 0x0003,
    //     ManufacturerName: 0x0004,
    //     ModelIdentifier: 0x0005,
    //     DateCode: 0x0006,
    //     PowerSource: 0x0007
    // }

    // this.deviceInfo = {
    //     zclVersion: 0x00,
    //     applicationVersion: 0x00,
    //     stackVersion: 0x00,
    //     hwVersion: 0x00,
    //     manufacturerName: '',
    //     modelIdentifier: '',
    //     dateCode: '',
    //     powerSource: 0x00
    // };
    // 
    this.basicClusterAttributeId = {
        0x0000: 'ZCLVersion',
        0x0001: 'ApplicationVersion',
        0x0002: 'StackVersion',
        0x0003: 'HWVersion',
        0x0004: 'ManufacturerName',
        0x0005: 'ModelIdentifier',
        0x0006: 'DateCode',
        0x0007: 'PowerSource'
    }
};

Basic.prototype = Object.create(EventEmitter.prototype);

Basic.prototype.set = function(value) {
};

Basic.prototype.get = function(attrId) {
    var self = this;
    self.logger.info('Basic get attribute ' + attrId);

    return new Promise(function(resolve, reject) {
        self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_READ_ATTR, 
                            srcEp: DEFINES.SOURCE_ENDPOINT, 
                            dstAddr: self.nodeId, 
                            endPoint: self.endPoint, 
                            addrMode: DEFINES.ADDR_MODE.ADDR_16BIT, 
                            clusterId: self.clusterClass, 
                            numAttr: 1, 
                            attrId: [attrId], 
                            direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR, 
                            disableDefaultRsp: false}, { commandType: 'basic' + attrId, overrideOld: true, priority: 'highest'}).then(function(status) {
            // self.logger.debug("GOT STATUS: ", status);
            var respTimer = setTimeout(function() {
                self.logger.error('Basic get attribute ' + attrId + ' response timed out');
                resolve();
            }, 5000);

            self.multiplexer.on('attrResponse ' + self.clusterClass.toString() + self.nodeId.toString() + attrId.toString(), function(info) {
                self.multiplexer.removeAllListeners('attrResponse ' + self.clusterClass.toString() + self.nodeId.toString() + attrId.toString());
                clearTimeout(respTimer);
                var respBuf = info.payload;
                if(info.clusterId == DEFINES.CLUSTER_CLASS.GENERAL.BASIC) {
                    // logger.info("*********** ATTRIBUTE RESPONSE " + JSON.stringify(respBuf) + " **************");
                    if(respBuf['status'] == 0x00) {
                        if(typeof self.basicClusterAttributeId[respBuf['attrId']] !== 'undefined')  {
                            if(typeof respBuf['value'] !== 'undefined') {
                                self.logger.info('Response attribute ' + respBuf['attrId'] + ' ' + self.basicClusterAttributeId[respBuf['attrId']] + ' value- ' + respBuf['value']);
                                resolve(respBuf['value']);
                            } else {
                                self.logger.error('Got attribute response but something went wrong- ' + JSON.stringify(respBuf));
                                resolve();
                                // reject('Did not get value for attrId ' + attrId);
                            }
                        } else {
                            self.logger.warn('Unhandled attribute '+ JSON.stringify(respBuf));
                            resolve();
                            // reject('Unhandled attribute');
                        }
                    } else {
                        self.logger.warn('Device do not support this attribute- ' + JSON.stringify(respBuf));
                        resolve();
                        // reject('Device do not support this attribute');
                    }
                    // callNextAttribute();
                } else {
                    //based on the cluster Id report the data to its cluster class
                    self.logger.error('Got data from cluster other than basic- '+ JSON.stringify(info));
                    resolve();
                    // reject('Unknown cluster response in BASIC cluster. Critical error!');
                }
            });
        }, function(err) {
            self.logger.error('Failed to send basic get on attrId ' + attrId);
            resolve();
            // reject(err);   
        });
    });
};

Basic.prototype.report = function(value) {
    var self = this;
    return new Promise(function(resolve, reject) {
        self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_READ_ATTR, 
                                srcEp: DEFINES.SOURCE_ENDPOINT, 
                                dstAddr: self.nodeId, 
                                endPoint: self.endPoint, 
                                addrMode: DEFINES.ADDR_MODE.ADDR_16BIT, 
                                clusterId: self.clusterClass, 
                                numAttr: 1, 
                                attrId: [attrId], 
                                direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR, 
                                disableDefaultRsp: false}, { commandType: 'basic' + attrId, overrideOld: true, priority: 'highest'}).then(function(status) {
                                });
                // self.logger.debug("GOT STATUS: ", status);
    });
};

Basic.prototype.getDeviceInformation = function() {
    var self = this;
    var p = [];
    var info = {};

    var attrId = 0x0000;

    return new Promise(function(resolve, reject) {

        for(var i = 0 ; i <= 7; i++) {
            p.push(self.get(attrId++)); 
        }

        Promise.all(p).then(function(result) {
            result.forEach(function(value, index, array) {
                info[self.basicClusterAttributeId[index]] = (value === null || value === undefined) ? '' : value;
            });
            self.logger.info('Extracted device information from node id ' + self.nodeId + ' info ' + JSON.stringify(info)); 
            resolve(info);
        }, function(err) {
            self.logger.error('Failed to get device information ' + err);
            reject(err);
        }); 
    });
};

module.exports = Basic;