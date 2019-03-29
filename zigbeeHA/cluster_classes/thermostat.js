var EventEmitter = require('events').EventEmitter;
var DEFINES = require('./../lib/defs').DEFINES;
var Logger = require('./../utils/logger');

function Thermostat(options){
    var self = this;
	this.clusterClass = DEFINES.CLUSTER_CLASS.HVAC.THERMOSTAT;
    this.znpController = options.znpController;
    this.nodeId = options.nodeId;
    this.endPoint = options.endPoint;
    this.multiplexer = options.multiplexer;
    this.requests = [];

    this._systemModes = {
        off: 0x00,
        auto: 0x01,
        cool: 0x02,
        heat: 0x03
    };

    this._setPointModeAttrId = {
        cool: 0x0011,
        heat: 0x0012,
        occupiedCool: 0x0011,
        occupiedHeat: 0x0012,
        unoccupiedCool: 0x0013,
        unoccupiedHeat: 0x0014
    };

    //Reference- ZCLr04, document 075123r04ZB
    this._thermostatInformationAttrId = {
        localTemperature            :   0x0000,  /* LocalTemperature Signed 16-bit integer 0x954d –0x7fff Read - M*/
        outdoorTemperature          :   0x0001,  /* OutdoorTemperature Signed 16-bit integer 0x954d –0x7fff Read - O*/
        occupancy                   :   0x0002,  /* Ocupancy 8-bit bitmap 0000000x Read 00000000 O*/
        absMinHeatSetpointLimit     :   0x0003,  /* AbsMinHeatSetpointLimit Signed 16-bit integer 0x954d –0x7fff Read 0x02bc(7°C) O*/
        absMaxHeatSetpointLimit     :   0x0004,  /* AbsMaxHeatSetpointLimit Signed 16-bit integer 0x954d –0x7fff Read 0x0bb8(30°C) O*/
        absMinCoolSetpointLimit     :   0x0005,  /* AbsMinCoolSetpointLimit Signed 16-bit integer 0x954d –0x7fff Read 0x0640(16°C) O*/
        absMaxCoolSetpointLimit     :   0x0006,  /* AbsMaxCoolSetpointLimit Signed 16-bit integer 0x954d –0x7fff Read 0x0c80(32°C) O*/
        pICoolingDemand             :   0x0007,  /* PICoolingDemand Unsigned 8-bit integer 0x00 –0x64 Read - O*/
        pIHeatingDemand             :   0x0008   /* PIHeatingDemand Unsigned 8-bit integer 0x00 –0x64 Read - O*/
    };

    this._thermostatSettingsAttrId = {
        localTemperatureCalibration     :   0x0010, /*LocalTemperatureCalibration Signed 8-bitinteger 0xE7 – 0x19 Read /Write 0x00(0°C) O*/
        occupiedCoolingSetpoint         :   0x0011, /*OccupiedCoolingSetpoint Signed 16-bit integer MinCoolSetpointLimit –MaxCoolSetpointLimit Read /Write 0x0a28(26°C) M*/
        occupiedHeatingSetpoint         :   0x0012, /*OccupiedHeatingSetpoint Signed 16-bit integer MinHeatSetpointLimit –MaxHeatSetpointLimit Read /Write 0x07d0(20°C) M*/
        unoccupiedCoolingSetpoint       :   0x0013, /*UnoccupiedCoolingSetpoint Signed 16-bit integer MinCoolSetpointLimit –MaxCoolSetpointLimit Read /Write 0x0a28(26°C) O*/
        unoccupiedHeatingSetpoint       :   0x0014, /*UnoccupiedHeatingSetpoint Signed 16-bit integer MinHeatSetpointLimit –MaxHeatSetpointLimit Read /Write 0x07d0(20°C) O*/
        minHeatSetpointLimit            :   0x0015, /*MinHeatSetpointLimit Signed 16-bit integer 0x954d – 0x7fff Read /Write 0x02bc(7°C) O*/
        maxHeatSetpointLimit            :   0x0016, /*MaxHeatSetpointLimit Signed 16-bit integer 0x954d – 0x7fff Read /Write 0x0bb8(30°C) O*/
        minCoolSetpointLimit            :   0x0017, /*MinCoolSetpointLimit Signed 16-bit integer 0x954d – 0x7fff Read /Write 0x02bc(7°C) O*/
        maxCoolSetpointLimit            :   0x0018, /*MaxCoolSetpointLimit Signed 16-bit integer 0x954d – 0x7fff Read /Write 0x0bb8(30°C) O*/
        minSetpointDeadBand             :   0x0019, /*MinSetpointDeadBand Signed 8-bitinteger 0x0a – 0x19 Read /Write 0x19(2.5°C) O*/
        remoteSensing                   :   0x001a, /*RemoteSensing 8-bit bitmap 00000xxx Read /Write 0 O0x00 – 0x05 Read /Write 0x04 M*/
        controlSequenceOf               :   0x001b, /*ControlSequenceOf 8-bit Operation enumeration*/
        systemMode                      :   0x001c, /*SystemMode 8-bitenumeration See Table 6.15 Read /Write 0x01 M*/
        alarmMask                       :   0x001d, /*AlarmMask 8-bit bitmap 00000xxx Read only 0 O*/
        occupancyMode                   :   1616,
        supplyTemperature               :   1898,
        returnTemperature               :   1901,
        returnTemperature2              :   2022,
        roomTemperature                 :   1900,
        w1Status                        :   2141,
        w2Status                        :   2140,
        y2Status                        :   2139,
        y1Status                        :   2138,
        gStatus                         :   2150,
        w1Status2                       :   2651,
        w2Status2                       :   2652,
        y2Status2                       :   2650,
        y1Status2                       :   2649,
        gStatus2                        :   2648,
        deadband                        :   25
    };

    this._commands = {
        setPointRaiseLower  : 0x00
    };

    self.logger = new Logger( { moduleName: 'Thermostat' + this.nodeId, color: 'white'} );

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
        // console.log('got info ', info);
        var req;
        var found = false;
        for(var i = 0; i < self.requests.length; i++) {
            if(self.requests[i].attrId.indexOf(info.payload.attrId) > -1) {
                req = self.requests[i];
                self.requests.splice(i, 1);
                found = true;
                // console.log('Found old request ' + JSON.stringify(req));
                break;
            }
        }
        if(found) {
            var buf = info.payload;
            var bypass = req.bypass;
            var attrId = info.payload.attrId;
            buf['clusterClass'] = self.clusterClass;
            buf['clusterClassId'] = DEFINES.CLUSTER_CLASS_ID[self.clusterClass];
            if(buf['status'] == 0x00 && !bypass) {
                self.logger.info('Got attribute response- ' + JSON.stringify(buf));
                if(buf.attrId == self._thermostatSettingsAttrId.systemMode) {
                    Object.keys(self._systemModes).forEach(function(mode) {
                        if(self._systemModes[mode] == buf.value) {
                            self.logger.info('Got thermostat mode- '+ mode);
                            // resolve(mode);
                            req.prom.forEach(function(prm) {
                                // console.log("Resolving twice ", mode);
                                prm.resolve(mode);
                            });
                            return;
                        }
                    });
                    // resolve('off');
                    req.prom.forEach(function(prm) {
                        prm.resolve('off');
                    });
                    return;
                } else if (buf.attrId == self._thermostatSettingsAttrId.occupiedCoolingSetpoint) {
                    if(typeof buf.value !== 'undefined') {
                        var t = ((buf.value/100) * 9/5 + 32);
                        t = Math.round(t*Math.pow(10, 2))/Math.pow(10,2);
                        self.logger.info('Got occupied cool setpoint value- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.occupiedHeatingSetpoint) {
                    if(typeof buf.value !== 'undefined') {
                        var t = ((buf.value/100) * 9/5 + 32);
                        t = Math.round(t*Math.pow(10, 2))/Math.pow(10,2);
                        self.logger.info('Got occupied heat setpoint value- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.unoccupiedCoolingSetpoint) {
                    if(typeof buf.value !== 'undefined') {
                        var t = ((buf.value/100) * 9/5 + 32);
                        t = Math.round(t*Math.pow(10, 2))/Math.pow(10,2);
                        self.logger.info('Got unoccupied cool setpoint value- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.unoccupiedHeatingSetpoint) {
                    if(typeof buf.value !== 'undefined') {
                        var t = ((buf.value/100) * 9/5 + 32);
                        t = Math.round(t*Math.pow(10, 2))/Math.pow(10,2);
                        self.logger.info('Got unoccupied heat setpoint value- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.supplyTemperature) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value/10);
                        t = Math.round(t*Math.pow(10, 2))/Math.pow(10,2);
                        self.logger.info('Got supplyTemperature- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.returnTemperature) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value/10);
                        t = Math.round(t*Math.pow(10, 2))/Math.pow(10,2);
                        self.logger.info('Got returnTemperature- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.returnTemperature2) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value/10);
                        t = Math.round(t*Math.pow(10, 2))/Math.pow(10,2);
                        self.logger.info('Got returnTemperature- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.occupancyMode) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0x02 ? 'unoccupied' : 'occupied');
                        self.logger.info('Got occupancyMode- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.deadband) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value/10);
                        t = Math.round(t*Math.pow(10, 2))/Math.pow(10,2);
                        self.logger.info('Got deadband- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.w1Status) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got w1Status- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.w2Status) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got w2Status- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.y1Status) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got y1Status- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.y2Status) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got y2Status- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.gStatus) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got gStatus- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.w1Status2) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got w1Status- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.w2Status2) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got w2Status- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.y1Status2) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got y1Status- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.y2Status2) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got y2Status- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        return;
                    }
                } else if (buf.attrId == self._thermostatSettingsAttrId.gStatus2) {
                    if(typeof buf.value !== 'undefined') {
                        var t = (buf.value === 0 ? 'open': 'closed');
                        self.logger.info('Got gStatus- '+ t);
                        req.prom.forEach(function(prm) {
                            prm.resolve(t);
                        });
                        // resolve(t);
                        return;
                    }
                } else {

                }
                req.prom.forEach(function(prm) {
                    prm.resolve(buf);
                });
            } else if(!!bypass) {
                self.logger.info('Got attribute response- ' + JSON.stringify(buf));
                req.prom.forEach(function(prm) {
                    prm.resolve(buf);
                });
                // resolve(buf);
            } else {
                self.logger.error('AttrId ' + attrId + ', failed to get response- ' + JSON.stringify(buf));
                req.prom.forEach(function(prm) {
                    prm.reject(DEFINES.STATUS[buf['status']]);
                });
            }
        }       
    });
}

Thermostat.prototype = Object.create(EventEmitter.prototype);

Thermostat.prototype.setAttr = function(attrId, type, data) {
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
                            disableDefaultRsp: false}, { commandType: 'thermostat' + attrId, overrideOld: true, priority: 'highest' }).then(function(status) {
            self.logger.debug("GOT STATUS: " + status);
    });
};

Thermostat.prototype.setMode = function(mode) {
    var self = this;

    if(typeof mode === 'undefined' || typeof this._systemModes[mode] === 'undefined') {
        return Promise.reject(new Error('Thermostat mode not defined - ' + mode));
    }

    self.logger.info('Got system mode- ' + self._systemModes[mode]);
    // console.log('~~'+attrId);
    return self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_WRITE_ATTR,
                            srcEp: DEFINES.SOURCE_ENDPOINT,
                            dstAddr: self.nodeId,
                            endPoint: self.endPoint,
                            addrMode: DEFINES.ADDR_MODE.ADDR_16BIT,
                            clusterId: self.clusterClass,
                            cmdId: DEFINES.WORK_CODE.ZCL_WRITE_ATTR, // write command id (i.e. 0x02); should be a macro
                            numAttr: 1,
                            attrId: [self._thermostatSettingsAttrId.systemMode],
                            dataType: 0x30, //8-bit enumeration
                            cmdFormatLen: 1,
                            cmdFormat: new Buffer([self._systemModes[mode]]),
                            direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR,
                            disableDefaultRsp: false}, { commandType: 'thermostat', overrideOld: true, priority: 'highest' }).then(function(status) {
            self.logger.debug("GOT STATUS: " + status);
    });

};

Thermostat.prototype.setTemperatureLevel = function(mode, level) {
    // log.info('Got brightness: ', value);
    var self = this;

    if(typeof mode === 'undefined' || typeof level === 'undefined') {
        return Promise.reject(new Error('setTemperatureLevel mode or level is not defined'));
    }

    if(typeof self._setPointModeAttrId[mode] === 'undefined') {
        return Promise.reject(new Error('Unknown setpoint mode- ' + mode + ', must choose between ' + Object.keys(self._setPointModeAttrId)));
    }


    var setPoint = parseInt((level - 32) * (5 / 9) * 100);
    self.logger.info('Got thermostat setTemperatureLevel - ' + mode + ' setpoint ' + setPoint.toString(16));

    return self.multiplexer.send({workCode: DEFINES.WORK_CODE.ZCL_WRITE_ATTR,
                            srcEp: DEFINES.SOURCE_ENDPOINT,
                            dstAddr: self.nodeId,
                            endPoint: self.endPoint,
                            addrMode: DEFINES.ADDR_MODE.ADDR_16BIT,
                            clusterId: self.clusterClass,
                            cmdId: DEFINES.WORK_CODE.ZCL_WRITE_ATTR, // write command id (i.e. 0x02); should be a macro
                            numAttr: 1,
                            attrId: [self._setPointModeAttrId[mode]],
                            dataType: 0x29, //Signed 16-bit integer
                            cmdFormatLen: 2,
                            cmdFormat: new Buffer([setPoint & 0xFF, ((setPoint >> 8) & 0xFF)]),
                            direction: DEFINES.DIRECTION.ZCL_FRAME_CLIENT_SERVER_DIR,
                            disableDefaultRsp: false}, { commandType: 'thermostat', overrideOld: true, priority: 'highest' }).then(function(status) {
            self.logger.debug("GOT STATUS: " + status);
    });
};
/*Thermostat.prototype.call = function(value){

};*/

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

Thermostat.prototype.get = function (attrId, bypass, src) {
	var self = this;
    self.logger.info('Getting attribute id - ' + attrId);
    if(!src || typeof src !== 'string') {
        src = '';
    } else {
        self.logger.trace('Get attribute, request from source ' + JSON.stringify(src));
    }
    return new Promise(function(resolve, reject) {

        var commandType = 'thermostat' + self.nodeId + ' ' + attrId;
        var found = false;
        for(var i = 0; i < self.requests.length; i++) {
            // console.log('requests ', self.requests);
            if(self.requests[i].commandType === commandType) {
                // console.log('Found same type commandType ', commandType);
                self.logger.trace('Found same type commandType ', commandType);
                self.requests[i].prom.push({
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
                        prom: [{
                            resolve: resolve, 
                            reject: reject
                        }],
                        createdAt: new Date(),
                        bypass: bypass,
                        src: src
                    };
                    // console.log('req promise ', req.prom);
                    // 
            self.requests.push(req);
            self.multiplexer.send(JSON.parse(JSON.stringify(req)), { commandType: commandType, overrideOld: true }).then(function(status) {
            }, function(err) {
                self.logger.error('AttrId ' + attrId + ' failed to get response- ' + err);
                reject(err);
            });
        }
    });
};

Thermostat.prototype.report = function (value){
	return;
};

module.exports = Thermostat;