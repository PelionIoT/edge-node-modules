var EventEmitter = require('events').EventEmitter;
var Logger = require('./../utils/logger');
var DEFINES = require('./../lib/defs').DEFINES;


//Initialize multiplexer for each node
//All clusters send messages to multiplexer
//On parsing the request it either create batch request (concatenate attrIds) 
//or if the commandType is same then dont discard the duplicate requests but wait for the response from one request and
//then resolves or rejects the same commandType requests
//or forwards to znpcontroller
var Multiplexer = exports.Multiplexer = function(znpController, nodeId) {
    var self = this;
    this.znpController = znpController;
    this.nodeId = nodeId;
    this.responseMap = {};
    this.runningStatus = true;
    this._msgId = 0;
    this.logger = new Logger( { moduleName: 'Multiplexer' + this.nodeId, color: 'bgBlue'} );

    this.txQueue = [];
    this.txTimer = null;
    this.retryPeriod = 500;

    this.znpController.on('restart', function() {
        self.stop();
    });
};

Multiplexer.prototype = Object.create(EventEmitter.prototype);

Multiplexer.prototype.start = function () {
    var self = this;

    self.znpController.removeAllListeners('message ' + self.nodeId);
    self.znpController.on('message ' + self.nodeId, function(message) {
        var responseInMap = self.responseMap[message.buffer.msgId];
        if(responseInMap) {
            if(message.status === 0x00) {
                self.logger.info('Got SUCCESSFUL response for msgId ' + message.buffer.msgId + ' served in ' + (new Date() - message.buffer.createTime) + 'msec');
                // if(responseInMap.requestType === 'normal') {
                responseInMap.promise.forEach(function(prm) {
                    prm.resolve(message.status);
                });
                // }
                delete self.responseMap[message.buffer.msgId];
            } else if (message.buffer.retries === 0x00) {
                self.logger.warn('Request timed out with error for ' + self.nodeId + ' msgId ' + message.buffer.msgId);
                // self.logger.info('One of the node is down, force network topology refresh');
                // self.znpController.requestNetworkTopology();
                self.logger.trace('Got responseMap ' + JSON.stringify(responseInMap));
                responseInMap.promise.forEach(function(prm) {
                    self.logger.info('Event: Request timed out for attrId ' + prm.attrId);
                    prm.reject('Request timed out');
                });
                
                delete self.responseMap[message.buffer.msgId];
            } else {
                //retries != 0x00 and status != 0x00
                //dont delete the responseMap
            }
        } else {
            self.emit('message', message);
        }
    });

    self.znpController.removeAllListeners('attrResponse ' + self.nodeId.toString());
    self.znpController.on('attrResponse ' + self.nodeId.toString(), function(info) {
        self.logger.info('Got attr response for class- '+ info.clusterId + ' for node '+ info.srcAddr.toString(16));
        self.logger.trace('Got response ' + JSON.stringify(info));
        if(typeof info.payload !== 'undefined') {
            Object.keys(info.payload).forEach(function(attrId) {
                var data = JSON.parse(JSON.stringify(info));
                data.payload = info.payload[attrId];
                data.attr = attrId;
                if(info.clusterId !== 0x0000)
                    self.emit('attrResponse ' + info.clusterId.toString() + info.srcAddr.toString(), data); 
                else if(info.clusterId === 0x0000) {
                    self.emit('attrResponse ' + info.clusterId.toString() + info.srcAddr.toString() + data.attr.toString(), data);
                }   
            });
        } 
    });

    self.startTransmission();

    return Promise.resolve();
};

Multiplexer.prototype.stop = function () {
    var self = this;

    this.runningStatus = false;
    self.znpController.removeAllListeners('message ' + self.nodeId);
    self.znpController.removeAllListeners('attrResponse ' + self.nodeId.toString());
    self.stopTransmission();
    self.logger.info('Multiplexer stopped successfully for node ' + self.nodeId);
};

//Node is single threaded when this is executing no other function is executing, thus 
//there wont be a scenario where cluster class sends a request which is being parsed and 
//we are sending out the packets from the txQueue
Multiplexer.prototype.startTransmission = function() {
    var self = this;
    self.logger.trace('Starting multiplexer transmission line for nodeId ' + self.nodeId);
    this.txTimer = setInterval(function() {
        // self.logger.trace('In periodic transmission check...');
        while(self.txQueue.length > 0) {
            //Send the packet to znpController
            self.logger.debug('Found packet in tramission queue!');
            var packet = self.txQueue.shift();
            self.logger.info('Sending packet to znpController ' + JSON.stringify(packet));
            try {
                if(typeof packet === 'object') {
                    packet.buffer['seqNumber'] = self.znpController.getNextSeqId();
                    self.znpController.zclWork(packet.buffer, packet.msgId, packet.retries.retries, packet.priority).then(function(msgId) {
                        //Dont check the status, if the responseMap is deleted then stop the timeout
                        // if(req.status != 0) { 
                        var pkt = self.responseMap[msgId];
                        if(typeof pkt !== 'undefined') {
                            if(pkt.retries.retries === 0) {
                                // Retries over, reject promise
                                self.logger.warn('Request timed out for ' + pkt.buffer['dstAddr'] + ' msgId ' + pkt.msgId);
                                pkt.promise.forEach(function(promise) {
                                    self.logger.info('Timer: Request timed out for attrId ' + promise.attrId);
                                    promise.reject('Request timed out');
                                });

                                delete self.responseMap[msgId];
                            } else {
                                self.logger.debug('Starting retry period on request of msgId ' + msgId);
                                setTimeout(function() {
                                    //Check the responseMap, if it exist then check retries
                                    pkt = self.responseMap[msgId];
                                    if(typeof pkt !== 'undefined') {
                                        if(pkt.retries.retries !== 0) {
                                            if((typeof self.znpController.nodes[pkt.buffer['dstAddr']] !== 'undefined') && (self.znpController.nodes[pkt.buffer['dstAddr']]['life'] !== 'dead' )) {
                                                pkt.retries.retries -= 1;
                                                self.responseMap[msgId] = pkt;
                                                self.logger.info('Retries left on msgId ' + pkt.msgId + ',command type ' + pkt.type  + ' retries ' + pkt.retries.retries);
                                                self.txQueue.push(pkt);
                                            } else {
                                                self.logger.warn('Node is reported dead, thus dropping retry request for ' + pkt.buffer['dstAddr'] + ' of msgId ' + msgId);
                                                pkt.promise.forEach(function(promise) {
                                                    self.logger.info('Node reported dead, rejecting promise for ' + promise.attrId);
                                                    promise.reject('Request timed out');
                                                });
                                                delete self.responseMap[msgId];
                                            }
                                        }
                                    }
                                }, self.retryPeriod);
                            }
                        }
                    }, function(err) {
                        packet.promise.forEach(function(promise) {
                            promise.reject(err);
                        });
                    });
                }
            } catch(e) {
                self.logger.error("trySend failed with error " + e);
            }
        }
    }, 300);
};

Multiplexer.prototype.stopTransmission = function() {
    var self = this;
    clearInterval(this.txTimer);
    var len = this.txQueue.length;
    for(var i = 0; i < len; i++) {
        var pkt = this.txQueue.shift();
        pkt.promise.reject('Multiplexer stopped, deleting request');
    }
    this.txQueue = [];
};

Multiplexer.prototype.getNewMsgId = function() {
    return (this._msgId++ & 0xFFFF);
};

Multiplexer.prototype.send = function(buffer, options) {
    var self = this;

    // self.logger.trace("Sending buffer " + JSON.stringify(buffer));

    if(!this.runningStatus) {
        return Promise.reject('Multiplexer has been stopped, reinitiate the devices');
    }

    //Check if similar set or get is already in the queue, if it is then combine get and hold on to set


    if((typeof self.znpController.nodes[buffer['dstAddr']] !== 'undefined') && (self.znpController.nodes[buffer['dstAddr']]['life'] !== 'dead' )) {

        if(typeof options !== 'object') {
            options = { };
        }

        if(typeof options.retries !== 'number' || options.retries < 0) {
            options.retries = 5;
        }
        else {
            options.retries = parseInt(options.retries);
        }

        if(typeof options.retryPeriod !== 'number' || options.retryPeriod < 0) {
            options.retryPeriod = 1000;//500 is too fast for znp stack
        }
        else {
            options.retryPeriod = parseInt(options.retryPeriod);
        }

        if(typeof options.priority === 'undefined') {
            options.priority = '';
        }

        var retries = { retries: options.retries };
        var commandType = options.commandType;
        var overrideOld = !!options.overrideOld;
        var requestType = 'normal';


        //Restructure WRITE ATTR request
        if(buffer.workCode === DEFINES.WORK_CODE.ZCL_WRITE_ATTR) {
            if(typeof buffer.cmdFormat !== 'undefined' && typeof buffer.cmdFormat !== 'object') {
                return Promise.reject('cmdFormat should be of type object. Request clusterId ' + buffer.clusterId + ' attrId ' + buffer.attrId);
            }
            var command = new Buffer(2+1+1+buffer.cmdFormatLen);
            command.writeInt16BE(buffer.attrId, 0);
            command.writeUInt8(buffer.dataType, 2);
            command.writeUInt8(buffer.cmdFormatLen, 3);
            buffer.cmdFormat.copy(command, 4);

            buffer.cmdFormat = command;
            buffer.cmdFormatLen = buffer.cmdFormat.length;

            delete command;
        }

        // function trySend(msgId) {
        //     var packet = self.responseMap[msgId];
        //     try {
        //         if(typeof packet === 'object') {
        //             packet.buffer['seqNumber'] = self.znpController.getNextSeqId();
        //             self.znpController.zclWork(packet.buffer, msgId, packet.retries.retries, packet.priority).then(function(status) {
        //                 //Dont check the status, if the responseMap is deleted then stop the timeout
        //                 // if(status != 0) { 
        //                     setTimeout(function() {
        //                         var rMap = self.responseMap[msgId];
        //                         if(typeof rMap !== 'undefined') {
        //                             if(rMap.retries.retries === 0) {
        //                                 // reject promise
        //                                 self.logger.warn('Request timed out for ' + rMap.buffer['dstAddr']);
        //                                 rMap.reject(new Error('Request timed out'));

        //                                 delete self.responseMap[msgId];
        //                             }
        //                             else {
        //                                 self.logger.info('retries left on msgId ' + msgId + ' retries ' + rMap.retries.retries);
        //                                 rMap.retries.retries -= 1;
        //                                 // timeout *= 2;
        //                                 trySend(msgId);
        //                             }
        //                         }
        //                     }, options.retryPeriod);
        //                 // }
        //             });
        //         }
        //     } catch(e) {
        //          self.logger.error("trySend failed with error " + e);
        //     }
        // }

        return new Promise(function(resolve, reject) {
            //Dont cancel the same type requests. Save the promise and resolves it on response
            var foundRequest = false;
            if(typeof commandType === 'string' && overrideOld) {

                //Go through the txQueue and check if the similar request is already there 
                //If it is then modify the request
                Object.keys(self.responseMap).forEach(function(messageID) {
                    // var response = self.responseMap[messageID];

                    if(self.responseMap[messageID].type === commandType) {
                        foundRequest = true;
                        self.responseMap[messageID].promise.push({
                            resolve: resolve,
                            reject: reject
                        });
                        self.responseMap[messageID].requestType = 'sameCommandTypeRequest';

                        self.logger.debug('Found same command type "' + commandType + '" request from ' + buffer['dstAddr'] + '. Waiting for the response from the earlier request');

                        // self.logger.warn('Cancelling pending command for ' + buffer['dstAddr'] + ' of type '+ commandType + ' messageID ' + messageID);
                        // response.retries.retries = 0;
                        // response.reject(new Error('Request cancelled'));
                        // delete self.responseMap[messageID];
                        // return;
                    }
                });
            }

            //Go through the txQueue and see if you can create batch requests
            self.txQueue.forEach(function(request) {
                //TODO- we only create batch request for reads not for writes
                //Refer section 2.4 General Command Frames of ZCL official doc
                // self.logger.info('Comparing buffer ' + JSON.stringify(request.buffer));
                // self.logger.info('with ' + JSON.stringify(buffer));
                // 
                if(request.buffer.attrId.length < 10) { 
                    if(request.buffer.workCode == DEFINES.WORK_CODE.ZCL_READ_ATTR) {
                        if(request.buffer.srcEp == buffer.srcEp && 
                            request.buffer.dstAddr == buffer.dstAddr && 
                            request.buffer.endPoint == buffer.endPoint && 
                            request.buffer.addrMode == buffer.addrMode && 
                            request.buffer.clusterId == buffer.clusterId &&
                            request.buffer.direction == buffer.direction) {

                            self.logger.info('Found batch read request... clusterId ' + buffer.clusterId);
                            //You can concatenate the attrIds and send the request
                            foundRequest = true;
                            request.requestType = 'batchReadRequest';
                            request.type.push(commandType);
                            buffer.attrId.forEach(function(aId) {
                                //Incase of duplicate attribute request, we want to save the promise per attribute but not add to the attribute array
                                //On attribute response will resovle and reject all the related ids.
                                // console.log('Promise has ', request.promise);
                                request.promise.push({
                                    attrId: aId,
                                    resolve: resolve,
                                    reject: reject
                                });
                                if(request.buffer.attrId.indexOf(aId) == -1) {
                                    request.buffer.attrId.push(aId);
                                    request.buffer.numAttr++;
                                } else {
                                    self.logger.warn('Found duplicate attribute request ' + aId);
                                }
                            });

                            if(typeof self.responseMap[request.msgId] !== 'undefined') {
                                self.responseMap[request.msgId] = request;
                            }
                        }
                    } else if(request.buffer.workCode == DEFINES.WORK_CODE.ZCL_WRITE_ATTR) {
                        if(request.buffer.srcEp == buffer.srcEp && 
                            request.buffer.dstAddr == buffer.dstAddr && 
                            request.buffer.endPoint == buffer.endPoint && 
                            request.buffer.addrMode == buffer.addrMode && 
                            request.buffer.clusterId == buffer.clusterId &&
                            request.buffer.direction == buffer.direction) {

                            self.logger.info('Found batch write request... clusterId ' + buffer.clusterId);
                            foundRequest = true;
                            request.requestType = 'batchWriteRequest';
                            request.type.push(commandType);

                            buffer.attrId.forEach(function(aId) {
                                //Incase of duplicate attribute request, we want to save the promise per attribute but not add to the attribute array
                                //On attribute response will resovle and reject all the related ids.
                                // console.log('Promise has ', request.promise);
                                request.promise.push({
                                    attrId: aId,
                                    resolve: resolve,
                                    reject: reject
                                });
                                if(request.buffer.attrId.indexOf(aId) == -1) {
                                    request.buffer.attrId.push(aId);

                                    var buf = new Buffer(request.buffer.cmdFormat.length + buffer.cmdFormat.length);
                                    request.buffer.cmdFormat.copy(buf, 0);
                                    buffer.cmdFormat.copy(buf, request.buffer.cmdFormat.length);
                                    request.buffer.cmdFormat = buf;
                                    request.buffer.cmdFormatLen = request.buffer.cmdFormat.length;

                                    self.logger.trace('Formatted command format ' + JSON.stringify(request.buffer.cmdFormat));
                                    request.buffer.numAttr++;
                                    delete buf;
                                } else {
                                    self.logger.warn('Found duplicate attribute request ' + aId);
                                }
                            });
                        }
                    }
                }
            });

            if(!foundRequest) {
                var newMsgId = self.getNewMsgId();

                // self.logger.info('Sending data to '+ buffer['dstAddr'] + ' with msgID '+ msgId + ' command type '+ commandType);
                if(typeof buffer.attrId === 'undefined') {
                    //ZCL_SEND_COMMAND packet, then assign attrId = 0xFFFF
                    buffer.attrId = [0xFFFF];
                }

                buffer.createTime = new Date();
                buffer.msgId = newMsgId;
                buffer.retries = retries;
                buffer.priority = options.priority;

                var packet = {
                    msgId: newMsgId,
                    requestType: requestType,
                    promise: [ {resolve: resolve, reject: reject, attrId: buffer.attrId[0]} ],
                    retries: retries, 
                    type: [commandType], 
                    buffer: buffer, 
                    priority: options.priority
                };

                self.logger.info('Constructed request with msgId ' + newMsgId + ' packet- ' + JSON.stringify(packet));
                // console.log('Promise ', packet.promise);

                self.responseMap[newMsgId] = packet;
                self.txQueue.push(packet);
            } else {

            }
        });
    } else {
        self.logger.warn('Node is presumed dead, thus dropping request for ' + buffer['dstAddr']);
        return Promise.reject('Node is dead, dropping request');
    }
};