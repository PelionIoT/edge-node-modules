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

function ColorControl(options){
    var self = this;
	this.clusterClass = DEFINES.CLUSTER_CLASS.LIGHTING.COLOR_CONTROL;
    this.znpController = options.znpController;
    this.nodeId = options.nodeId;
    this.endPoint = options.endPoint;
    this.multiplexer = options.multiplexer;

    this.COMMAND = {};
    this.COMMAND.MOVE_TO_HUE                    = 0x00; //Len: 4, Payload: Hue, Direction, Transtion Time (2)
    this.COMMAND.MOVE_HUE                       = 0x01; //Len: 2, Payload: Mode, Rate
    this.COMMAND.STEP_HUE                       = 0x02; //Len: 4, Payload: Mode, Step, Transtion Time (2)
    this.COMMAND.MOVE_TO_SATURATION             = 0x03; //Len: 3, Payload: Saturation, Transtion Time (2)
    this.COMMAND.MOVE_SATURATION                = 0x04; //Len: 2, Payload: Mode, Rate
    this.COMMAND.STEP_SATURATION                = 0x05; //Len: 4, Payload: Mode, Step, Transtion Time (2)
    this.COMMAND.MOVE_TO_HUE_SATURATION         = 0x06; //Len: 4, Payload: Hue, Saturation, Transtion Time (2)
    this.COMMAND.MOVE_TO_COLOR                  = 0x07; //Len: 6, Payload: ColorX (2), ColorY (2), Transtion Time (2)
    this.COMMAND.MOVE_COLOR                     = 0x08; //Len: 6, Payload: RateX (2), RateY (2), Transtion Time (2)
    this.COMMAND.STEP_COLOR                     = 0x09; //Len: 6, Payload: StepX (2), StepY (2), Transtion Time (2)
    this.COMMAND.MOVE_TO_COLOR_TEMPERATURE      = 0x0A; //Len: 4, Payload: ColorTemp(2), Transtion Time (2)

    this.COLORTEMP = {};
    this.COLORTEMP.TOP = 6500;
    this.COLORTEMP.BOTTOM = 2700;

    this.lastColorCall = 'hsl';
    this.hslState = {h:0, s:1, l:0.5};
    this.colorTempState = 5000;

    self.logger = new Logger( { moduleName: 'ColorControl' + this.nodeId, color: 'white'} );
};

ColorControl.prototype = Object.create(EventEmitter.prototype);

ColorControl.prototype.set = function(value) {
    var self = this;
    if(typeof value.h != 'undefined') { //hsl
        self.logger.info('got color set: ' + JSON.stringify(value));
        this.hslState.h = value.h;
        this.lastColorCall = 'hsl';
        return self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_SEND_COMMAND, 
                            srcEp: DEFINES.SOURCE_ENDPOINT, 
                            dstAddr: self.nodeId, 
                            endPoint: self.endPoint, 
                            addrMode: DEFINES.ADDR_MODE.ADDR_16BIT, 
                            clusterId: self.clusterClass, 
                            cmdId: self.COMMAND.MOVE_TO_HUE_SATURATION,
                            specific: 1,
                            direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR, 
                            disableDefaultRsp: false,
                            manuCode: 0,
                            cmdFormatLen: 4,
                            cmdFormat: new Buffer([value.h * 254, 250, 0, 0]) }, { commandType: 'color_control', overrideOld: true, priority: 'highest'});

    } else if(typeof value.temp != 'undefined') { //K
        self.logger.info('got K set: ' + JSON.stringify(value));
        this.colorTempState = value.temp;
        this.lastColorCall = 'colorTemperature';
        var colorTemp = 1000000 / (((self.COLORTEMP.TOP - self.COLORTEMP.BOTTOM) / 8000) * value.temp + 1500);

        self.logger.info('sending colorTemp: ' + colorTemp.toString(16));

        // if(colorTemp < (1000000 / self.COLORTEMP.BOTTOM)) {
        //     colorTemp = 1000000 / self.COLORTEMP.BOTTOM;
        // }

        // if(colorTemp > (1000000 /self.COLORTEMP.TOP)) {
        //     colorTemp = 1000000 / self.COLORTEMP.TOP;
        // }

        return self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_SEND_COMMAND, 
                            srcEp: DEFINES.SOURCE_ENDPOINT, 
                            dstAddr: self.nodeId, 
                            endPoint: self.endPoint, 
                            addrMode: DEFINES.ADDR_MODE.ADDR_16BIT, 
                            clusterId: self.clusterClass, 
                            cmdId: self.COMMAND.MOVE_TO_COLOR_TEMPERATURE,
                            specific: 1,
                            direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR, 
                            disableDefaultRsp: false,
                            manuCode: 0,
                            cmdFormatLen: 4,
                            cmdFormat: new Buffer([(colorTemp & 0xFF), ((colorTemp >> 8) & 0xFF), 0, 0]) }, { commandType: 'color_control', overrideOld: true, priority: 'highest'});

    } else {
        // Test setup
        self.logger.info('got test set: ' +  JSON.stringify(value));
        var self = this;
        return self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_SEND_COMMAND, 
                            srcEp: DEFINES.SOURCE_ENDPOINT, 
                            dstAddr: self.nodeId, 
                            endPoint: self.endPoint, 
                            addrMode: DEFINES.ADDR_MODE.ADDR_16BIT, 
                            clusterId: self.clusterClass, 
                            cmdId: value.cmd,
                            specific: 1,
                            direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR, 
                            disableDefaultRsp: false,
                            manuCode: 0,
                            cmdFormatLen: value.payloadLen,
                            cmdFormat: new Buffer(value.payload) }, { commandType: 'color_control', overrideOld: true, priority: 'highest' });

    }
};

ColorControl.prototype.get = function(property) {
    if(property == 'hsl') {
        if(this.lastColorCall == 'hsl') {
            return this.hslState;
        } else {
            return null;
        }
    } else if (property == 'K') {
        if(this.lastColorCall == 'colorTemperature') {
            return this.colorTempState;
        } else {
            return null;
        }
    } else {
        return null;
    }
    // var self = this;
    // console.log('got colorcontrol: ', attrId);
    // return self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_READ_ATTR, 
    //                         srcEp: DEFINES.SOURCE_ENDPOINT, 
    //                         dstAddr: self.nodeId, 
    //                         endPoint: self.endPoint, 
    //                         addrMode: DEFINES.ADDR_MODE.ADDR_16BIT, 
    //                         clusterId: self.clusterClass, 
    //                         numAttr: 1, 
    //                         attrId: attrId, 
    //                         direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR, 
    //                         disableDefaultRsp: false}, { commandType: 'color_control', overrideOld: true }).then(function(status) {
    //         console.log("GOT STATUS: ", status);
    //     });
};

ColorControl.prototype.setLocal = function(property, value) {
    if(property == 'hsl') {
        this.hslState = value;
    }

    if(property == 'K') {
        this.colorTempState = value;
    }

    if(property == 'lastColorCall') {
        this.lastColorCall = value;
    }
};

ColorControl.prototype.report = function(value) {
    var self = this;
    Object.keys(value).forEach(function(key) {
        if(key == 'K') {
            self.colorTempState = value[key];
        } else if (key == 'hsl') {
            self.hslState = value[key];
        }
    });
    return;
};

module.exports = ColorControl;