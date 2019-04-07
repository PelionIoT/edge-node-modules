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

function Level(options){
    var self = this;
	this.clusterClass = DEFINES.CLUSTER_CLASS.GENERAL.LEVEL_CONTROL;
    this.znpController = options.znpController;
    this.nodeId = options.nodeId;
    this.endPoint = options.endPoint;
    this.multiplexer = options.multiplexer;
    this.maxBrightness = 0xFF;
    this.transitionTimeLB = 0xFF;
    this.transitionTimeHB = 0xFF;

    this.COMMAND = {};
    this.COMMAND.MOVE_TO_LEVEL          = 0x00;
    this.COMMAND.MOVE                   = 0x01;
    this.COMMAND.STEP                   = 0x02;
    this.COMMAND.STOP                   = 0x03;
    this.COMMAND.MOVE_TO_LEVEL_ONOFF    = 0x04;
    this.COMMAND.MOVE_ONOFF             = 0x05;
    this.COMMAND.STEP_ONOFF             = 0x06;
    this.COMMAND.STOP_ONOFF             = 0x07;

    this.levelState = 1;
    
    self.logger = new Logger( { moduleName: 'Level' + this.nodeId, color: 'white'} );

    this.requests = [];
    self.respTimer = setInterval(function() {
        self.requests.forEach(function(req, index, array) {
            var present = new Date();
            if((present - req.createdAt) > 5000) {
                // console.log('requests ', req);
                self.logger.error('Get attribute response timed out... ' + req.attrId);
                if(typeof req.prom !== 'undefined') {
                    req.prom.forEach(function(prm) {
                        prm.reject('Get attribute response timed out');
                    });
                }
                self.requests.splice(index, 1);
            }
        });
    }, 1000);

    self.multiplexer.on('attrResponse ' + self.clusterClass.toString() + self.nodeId.toString(), function(info) {
        var req;
        var found = false;
        for(var i = 0; i < self.requests.length; i++) {
            if(self.requests[i].attrId.indexOf(info.payload.attrId) > -1) {
                req = self.requests[i];
                self.requests.splice(i, 1);
                found = true;
                break;
            }
        }
        if(found) {
            var buf = info.payload;
            var bypass = req.bypass;
            var attrId = info.payload.attrId;
            buf['clusterClass'] = self.clusterClass;
            buf['clusterClassId'] = DEFINES.CLUSTER_CLASS_ID[self.clusterClass];
            // log.info('Got temperature value- ', ((buf.value/100) * 9/5 + 32));
            // self.logger.info('Got level info- ' + JSON.stringify(buf));

            if(buf['status'] == 0x00 && !bypass) {
                var t = new Buffer(1);
                t.writeInt8(buf.value);
                var value = Math.round( (t[0] / 254) * Math.pow(10, 3)) / (Math.pow(10, 3));
                self.logger.info('Got level value- ' + value);
                req.promise.forEach(function(prm) {
                    prm.resolve(value);
                });
            } else if(!!bypass) {
                self.logger.info('Got attribute response- ' + JSON.stringify(buf));
                req.promise.forEach(function(prm) {
                    prm.resolve(buf);
                });
            } else {
                self.logger.error('AttrId ' + attrId + ', failed to get response- ' + JSON.stringify(buf));
                req.promise.forEach(function(prm) {
                    prm.reject(DEFINES.STATUS[buf['status']]);
                });
            }
        }
    });
};

Level.prototype = Object.create(EventEmitter.prototype);

Level.prototype.set = function(value) {
    // log.info('Got brightness: ', value);
    var self = this;

    this.levelState = value;

    var dimLevel = parseInt(self.maxBrightness*value);

    if(dimLevel > self.maxBrightness) {
        dimLevel = self.maxBrightness;
    }
    self.logger.info('sending brightness: ' + dimLevel);

    return self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_SEND_COMMAND, 
                        srcEp: DEFINES.SOURCE_ENDPOINT, 
                        dstAddr: self.nodeId, 
                        endPoint: self.endPoint, 
                        addrMode: DEFINES.ADDR_MODE.ADDR_16BIT, 
                        clusterId: self.clusterClass, 
                        cmdId: self.COMMAND.MOVE_TO_LEVEL_ONOFF,
                        specific: 1,
                        direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR, 
                        disableDefaultRsp: false,
                        manuCode: 0,
                        cmdFormatLen: 3,
                        cmdFormat: new Buffer([dimLevel, self.transitionTimeLB, self.transitionTimeHB]) }, { commandType: 'level', overrideOld: true, priority: 'highest' });
};

Level.prototype.get = function(attrId, bypass) {
    // var self = this;
    // return this.levelState;
    var self = this;

    if(typeof attrId === 'undefined' || typeof attrId !== 'number') {
        self.logger.trace('AttrId not defined, using default 0x0000');
        attrId = 0x0000;
    }

    return new Promise(function(resolve, reject) {

        var commandType = 'level' + self.nodeId + ' ' + attrId;
        var found = false;
        for(var i = 0; i < self.requests.length; i++) {
            if(self.requests[i].commandType === commandType) {
                self.logger.trace('Found same type commandType ', commandType);
                self.requests[i].promise.push({
                    resolve: resolve, 
                    reject: reject
                });
                found = true;
                break;
            }
        }

        if(!found) {
            var req = {
                        workCode: DEFINES.WORK_CODE.ZCL_READ_ATTR,
                        srcEp: DEFINES.SOURCE_ENDPOINT,
                        dstAddr: self.nodeId,
                        endPoint: self.endPoint,
                        addrMode: DEFINES.ADDR_MODE.ADDR_16BIT,
                        clusterId: self.clusterClass,
                        numAttr: 1,
                        attrId: [attrId],
                        direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR,
                        disableDefaultRsp: false,
                        commandType: commandType,
                        promise: [{resolve: resolve, reject: reject}],
                        createdAt: new Date(),
                        bypass: bypass
                    };
            self.requests.push(req);
            self.multiplexer.send(JSON.parse(JSON.stringify(req)), { commandType: commandType, overrideOld: true }).then(function(status) {
            }, function(err) {
                self.logger.error('AttrId ' + attrId + ' failed to get response- ' + err);
                reject(err);
            });
        }
    });
};

Level.prototype.report = function(value) {
    this.levelState = value;
    return;
};

module.exports = Level;