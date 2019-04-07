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

function RelativeHumidity(options){
    var self = this;
	this.clusterClass = DEFINES.CLUSTER_CLASS.MEASUREMENT_SENSING.RELATIVE_HUMIDITY_MEASUREMENT;
    this.znpController = options.znpController;
    this.nodeId = options.nodeId;
    this.endPoint = options.endPoint;
    this.multiplexer = options.multiplexer;
    
    self.logger = new Logger( { moduleName: 'RelativeHumidity' + this.nodeId, color: 'white'} );

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
            // self.logger.info('Got FanControl info- ' + JSON.stringify(buf));

            if(buf['status'] == 0x00 && !bypass) {
                self.logger.info('Got RelativeHumidity value- ' + buf.value);
                req.promise.forEach(function(prm) {
                    prm.resolve(buf.value);
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

RelativeHumidity.prototype = Object.create(EventEmitter.prototype);


RelativeHumidity.prototype.setAttr = function(attrId, type, data) {
    var self = this;

    data = new Buffer(data);
    return self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_WRITE_ATTR, 
                            srcEp: DEFINES.SOURCE_ENDPOINT, 
                            dstAddr: self.nodeId, 
                            endPoint: self.endPoint, 
                            addrMode: DEFINES.ADDR_MODE.ADDR_16BIT, 
                            clusterId: self.clusterClass,
                            cmdId: DEFINES.WORK_CODE.ZCL_WRITE_ATTR, // write command id (i.e. 0x02); should be a macro
                            numAttr: 1, 
                            attrId: [attrId],
                            dataType: self.znpController.getDataType(type), //8-bit enumeration
                            cmdFormatLen: data.length,
                            cmdFormat: data,
                            direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR, 
                            disableDefaultRsp: false}, { commandType: 'RelativeHumidity' + attrId, overrideOld: true, priority: 'highest' }).then(function(status) {
            self.logger.debug("GOT STATUS: " + status);
    });
}

RelativeHumidity.prototype.set = function(){
    return Promise.reject('Read only cluster class');
};

// function parseAttrResponse(payload) {
//     var buf = {};
//     buf['attrId'] = (payload[0] & 0xFF) + ((payload[1] << 8) & 0xFF);
//     buf['status'] = payload[2];
//     if(buf['status'] == 0x00) {
//         buf['dataType'] = payload[3];
//         buf['value'] = payload.readIntLE(4, 2);
//     }
//     return buf;
// }

RelativeHumidity.prototype.get = function (attrId, bypass) {

    var self = this;

    if(typeof attrId === 'undefined' || typeof attrId !== 'number') {
        self.logger.trace('AttrId not defined, using default 0x0000');
        attrId = 0x0000;
    }

    return new Promise(function(resolve, reject) {

        var commandType = 'RelativeHumidity' + self.nodeId + ' ' + attrId;
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

RelativeHumidity.prototype.report = function (value){
	return;
};

module.exports = RelativeHumidity;