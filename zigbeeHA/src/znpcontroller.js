var ZNP = require('node-znp');
var Multiplexer = require('./multiplexer').Multiplexer;
var EventEmitter = require('events').EventEmitter;
var Promise = require('es6-promise').Promise;
var DEFINES = require('./../lib/defs').DEFINES;
var BasicCluster = require('./../cluster_classes/basic');
var Logger = require('./../utils/logger');
var handleBars = require('handlebars');

var logger = new Logger( { moduleName: 'ZNPController', color: 'magenta'} );

/*
 * Default options
 */
var _options = {
	siodev: "/dev/ttyUSB0",
	devType: 0x00,
	newNwk: false,
	channelMask: 0x800,
	baudrate: 115200,
	panIdSelection: "randomInRange",
	panId: 65535
};

var zclWorkStatus = {
	0x00: 'SUCCESS',
	0x01: 'FAILED',
	0x02: 'INVALID_PARAMETER',
	0x10: 'MEM_FAIL',
	0xCD: 'NO_ROUTE',
	0xB8: 'DUPLICATE'
};

var basicClusterAttributeId = {
	0x0000: 'ZCLVersion',
	0x0001: 'ApplicationVersion',
	0x0002: 'StackVersion',
	0x0003: 'HWVersion',
	0x0004: 'ManufacturerName',
	0x0005: 'ModelIdentifier',
	0x0006: 'DateCode',
	0x0007: 'PowerSource'
};

/**
* ZigBee Network Processor (ZNP) controller
*
* @class ZNPController
* @constructor
* @param {Object} config options required to setup zigbee mesh network
*/
var ZNPController = function(options) {
	this.configuration = options || {};
	/**
	 * Device Type- 0=Coordinator, 1=Router, 2=End device
	 *
	 * @property devType
	 * @type Number
	 * @default 0
	 */
	this.configuration.devType = options.devType || _options.devType;

	/**
	 * New or restore network- true=New, false=Restore
	 *
	 * @property newNwk
	 * @type Boolen
	 * @default false
	 */
	this.configuration.newNwk = options.newNwk || _options.newNwk;

	/**
	 * ZigBee Channel
	 *
	 * @property devType
	 * @type Number
	 * @default 25
	 */
	this.configuration.channelMask = options.channelMask || _options.channelMask;

	/**
	 * Baud Rate
	 *
	 * @property baudrate
	 * @type Number
	 * @default 115200
	 */
	this.configuration.baudrate = options.baudrate || _options.baudrate;

	/**
	 * PAN ID selection scheme
	 *
	 * @property panIdSelection
	 * @type String
	 * @default "randomInRange"
	 */
	if(typeof options.panIdSelection !== 'undefined') {
		if(options.panIdSelection == 'random') {
			this.configuration.panId = Math.ceil(Math.random() * 65500);
		} else if (options.panIdSelection == 'fixed') {
			this.configuration.panId = options.panId || _options.panId;
		} else if (options.panIdSelection == 'randomInRange') {
			this.configuration.panId = Math.ceil(Math.random() * 100);
		} else {
			this.configuration.panId = Math.ceil(Math.random() * 65500);
		}
	} else {
		this.configuration.panId = Math.ceil(Math.random() * 65500);
	}
	logger.info('Starting ZNP controller with panid - ' + this.configuration.panId);

	/**
	 * Serial I/O port
	 *
	 * @property siodev
	 * @type String
	 * @default "/dev/ttyUSB0"
	 */
	this.siodev = options.siodev || _options.siodev;
	this.zclWorkResponseQueue = {};
	this.zclThrottleRequest = [];
	this.zclSetRequests = [];
	this.throttleInterval;
	this._enablePeriodicRefresh = false;
	this._zclWorkInProgress = false;
	this._waitingTXCount = 0;

	/**
	 * Throttle rate
	 *
	 * @property throttleRate
	 * @type Number
	 * @default 100ms
	 */
	this.throttleRate = 100;
	this.nodes = {};
	this.state = false;
	this._seqId = 0;
	this.topology = {};
	this.networkRefreshInterval;
	this.identificationInProgress = false;
	this.identificationQueue = {};
	this.permitTimer = null;
	this.permitMode = false;
	this.rebootCounter = 0;
	this.lifeLineGradient = 4;
};

ZNPController.prototype = Object.create(EventEmitter.prototype);

/**
 * Start ZNP node module and event listeners
 *
 * @method start
 * @return {Promise} The success handler accepts no parameter. The failure
 *  handler accepts a single error object.
 */
ZNPController.prototype.start = function(options) {
	var self = this;

	if(typeof options !== 'undefined') {
		this.siodev = options.siodev || this.siodev;
		this.configuration.baudrate = options.baudrate || this.configuration.baudrate;
	}

	return new Promise(function(resolve, reject) {
		self.znp = new ZNP(self.siodev, self.configuration);

		var znp = self.znp = self.znp.znp;

		var neverStartedTimer = setTimeout(function() {
			logger.error('ZNP controller never got network ready event, try restarting...');
			reject('Network ready timed out');
		}, 60000);

		znp.onNetworkReady(function() {
			self.throttleWorkRequest();
			clearTimeout(neverStartedTimer);
			resolve();
		});

		znp.onNetworkFailed(function() {
			clearTimeout(neverStartedTimer);
			reject('Network failed');
		});

		znp.onNodeDiscovered(function(nodeInfo, IEEEAddr, inClusterList, outClusterList) {

			function identifyNode(nodeId, nodeInfo) {
			 	logger.info('Node discovered ' + nodeInfo.nwkAddr);
		        if(nodeInfo.profileID == 0xC05E || nodeInfo.profileID == 0x0104) {
                    self.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.GET_MANUFACTURER_INFO);
		           	// self.identifyDiscoveredNode(nodeId, nodeInfo);
		           	self.getNodeManufacturerInformation(nodeId, nodeInfo);
				}
			}

			if(nodeInfo.nwkAddr != 0) {
				logger.info('Discovered new node ' + nodeInfo.nwkAddr);
				ddb.local.get('zigbeeHA:devices.' + nodeInfo.nwkAddr).then(function(nodeinfo) {

					if(nodeinfo == null || nodeinfo.siblings.length == 0) {
						throw new Error('Not in the database');
					}
					var nodeMetadata = JSON.parse(nodeinfo.siblings[0]);

					self.nodes[nodeInfo.nwkAddr] = nodeMetadata;
					self.nodes[nodeInfo.nwkAddr]['life'] = 'alive';
					/**
					* Fired when a device is online
					*
					* @event reachable + nwkAddr
					* @param {Boolean} value true if device is online, false otherwise
					*/
					self.emit('reachable ' + nodeInfo.nwkAddr.toString(), true);
					logger.info('Found the device in the database...' + JSON.stringify(self.nodes[nodeInfo.nwkAddr]));
					//If pairing not complete then 
					if(!self.nodes[nodeInfo.nwkAddr].deviceControllerCreated) {
						logger.info('Device controller was not created on ' + nodeInfo.nwkAddr.toString() + ' so trying again!');
						identifyNode(nodeInfo.nwkAddr, self.nodes[nodeInfo.nwkAddr]);
					}
				}).then(function() {
				}, function(error) {
					logger.info('New node ' + nodeInfo.nwkAddr.toString(16) + ' NOT found in the database, adding it...');
					logger.info('Device metadata ' + JSON.stringify(nodeInfo) + ' IEEEAddr ' + IEEEAddr + ' inClusterList ' + JSON.stringify(inClusterList) +
						'outClusterList ' + JSON.stringify(outClusterList));
					if(nodeInfo.numInClusters === 0) {
						logger.warn('Got node endpoint with empty incluster, dropping this endpoint...');
						return;
					}
					try {
						if(typeof self.nodes[nodeInfo.nwkAddr] === 'undefined' || self.nodes[nodeInfo.nwkAddr].endpoint === nodeInfo.endpoint) {
							self.nodes[nodeInfo.nwkAddr] = nodeInfo;
							self.nodes[nodeInfo.nwkAddr]['IEEEAddr'] = IEEEAddr;
							var inclusterTemp = new Buffer(inClusterList);
							var outclusterTemp = new Buffer(outClusterList);

							if(typeof self.nodes[nodeInfo.nwkAddr]['inClusterList'] === 'undefined') {
								self.nodes[nodeInfo.nwkAddr]['inClusterList'] = [];
							}
							for(var i = 0; i < nodeInfo.numInClusters; i++) {
								self.nodes[nodeInfo.nwkAddr]['inClusterList'].push(inclusterTemp.readUInt16LE(i*2));
							}


							if(typeof self.nodes[nodeInfo.nwkAddr]['outClusterList'] === 'undefined') {
								self.nodes[nodeInfo.nwkAddr]['outClusterList'] = [];
							}
							for(var i = 0; i < nodeInfo.numOutClusters; i++) {
								self.nodes[nodeInfo.nwkAddr]['outClusterList'].push(outclusterTemp.readUInt16LE(i*2));
							}
							/**
							* When new device is discovered, notify other resources
							*
							* @event pairingProgressEvent
							* @param {Number} progressId onboarding progress percentage
							*/
							self.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.FOUND_DEVICE);

							/**
							* Notify manager to inspect the metadata and start controller
							*
							* @event node discovered
							* @param {Number} nwkAddr network address of the device
							* @param {Object} metadata node info of the device
							*/
							identifyNode(nodeInfo.nwkAddr, self.nodes[nodeInfo.nwkAddr]);
							// var nodeInfo = self.nodes[nodeInfo.nwkAddr];
						 // 	logger.info('Node discovered ' + nodeInfo.nwkAddr);
					  //       if(nodeInfo.profileID == 0xC05E || nodeInfo.profileID == 0x0104) {
			    //                 self.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.GET_MANUFACTURER_INFO);
					  //          	self.identifyDiscoveredNode(nodeId, nodeInfo);
							// }
							// self.emit('node discovered', nodeInfo.nwkAddr);
						} else {
							logger.warn('New node, new endpoint discovered. Not yet implemented.');
						}
						self.nodes[nodeInfo.nwkAddr]['life'] = 'alive';
						self.emit('reachable ' + nodeInfo.nwkAddr.toString(), true);
					} catch (e) {
						logger.error("onNodeDiscovered Error: " + JSON.stringify(e));
					}

				});
			}
		});

		znp.onCmdResponse(function(status, seqId) {
			logger.debug('Got RESPONSE status- '+ status + ' for request seqNumber '+ seqId);
			self._zclWorkInProgress = false;
			if(typeof self.zclWorkResponseQueue[parseInt(seqId)] != 'undefined') {
				self.zclWorkResponseQueue[seqId]['status'] = status;

				/**
				* Fired when receive command response from the device
				*
				*	MT_RPC_SUCCESS = 0,         success
				*	MT_RPC_ERR_SUBSYSTEM = 1,   invalid subsystem
				*	MT_RPC_ERR_COMMAND_ID = 2,  invalid command ID
				*	MT_RPC_ERR_PARAMETER = 3,   invalid parameter
				*	MT_RPC_ERR_LENGTH = 4       invalid length
				*
				* @event message + nwkAddr
				* @param {Object} response command response
				*/
				logger.debug('Deleting zclWorkResponseQueue of seqNumber ' + seqId);

				self.emit('message ' + self.zclWorkResponseQueue[seqId].buffer.dstAddr, self.zclWorkResponseQueue[seqId]);
				delete self.zclWorkResponseQueue[seqId];

				//delete the previous work responses
				// Object.keys(self.zclWorkResponseQueue).forEach(function(seqNo) {
				// 	if(seqNo <= seqId) {
				// 		if(typeof self.zclWorkResponseQueue[seqNo] !== 'undefined') {
				// 			if(typeof self.zclWorkResponseQueue[seqNo]['status'] == 'undefined') {
				// 				logger.debug('deleting work response for seqid- '+ seqNo);
				// 				delete self.zclWorkResponseQueue[seqNo];
				// 			}
				// 		}
				// 	}
				// });
			} else {
				logger.error('Got nontracking seqNumber response: ' + seqId);
			}
		});

		znp.onAttrResponse(function(info, payload, seqId) {
			logger.trace('Got Attribute response from '+ JSON.stringify(info));
			logger.trace('onAttrResponse with payload: ' + JSON.stringify(payload));

			info['payload'] = self.parseAttrResponse(payload);

			/**
			* Fired when receive attribute response from the device
			*
			* @event attrResponse + nwkAddr
			* @param {Object} response attribute response
			*/
			self.emit('attrResponse ' + info.srcAddr.toString(), info);
		});

		znp.onNetworkTopology(function(nodeTopology) {
			var nodeAddr = nodeTopology.readUInt16LE(0);
			if(typeof self.topology[nodeAddr] === 'undefined') {
				self.topology[nodeAddr] = {};
			}

			self.topology[nodeAddr].type = DEFINES.DEVICETYPE[nodeTopology.readUInt8(2)];
			self.topology[nodeAddr].childCount = nodeTopology.readUInt8(3);
			if(self.topology[nodeAddr].childCount > 0) {
				if(typeof self.topology[nodeAddr].children === 'undefined') {
					self.topology[nodeAddr].children = {};
				}
				for(var i = 1; i <= self.topology[nodeAddr].childCount; i++) {
					var childAddr = nodeTopology.readUInt16LE(i*4);
					self.topology[nodeAddr].children[childAddr] = {};
					self.topology[nodeAddr].children[childAddr].type = DEFINES.DEVICETYPE[nodeTopology.readUInt8((i*4) + 2)];
					self.topology[nodeAddr].children[childAddr].lqi = nodeTopology.readUInt8((i*4) + 3);

					if(typeof self.nodes[childAddr] !== 'undefined') {
						self.nodes[childAddr].macAddr = nodeTopology.readUIntLE((i*4) + 4, 8).toString(16);
						// logger.info('Got mac address ' + self.nodes[childAddr].macAddr);
					}
				}
			}
			logger.info('node update- ' + nodeAddr + ' Network topology- ' + JSON.stringify(self.topology));
			if(typeof self.nodes[nodeAddr] !== 'undefined') {
				logger.info('LIFE: node- ' + nodeAddr + ' is alive');
				self.nodes[nodeAddr].life = 'alive';
				self.topology[nodeAddr].status = self.nodes[nodeAddr].life;
				self.topology[nodeAddr].name = self.nodes[nodeAddr].resourceID;
				self.emit('reachable ' + nodeAddr.toString(), true);
			}
		});

		znp.onDeviceJoinedNetwork(function(buf) {
			logger.trace('New device joined network - ' + JSON.stringify(buf));
			if(typeof buf.srcAddr !== 'undefined') {
				if(typeof self.nodes[buf.srcAddr] !== 'undefined') {
					logger.info('Device joined network - ' + buf.srcAddr);
					self.nodes[buf.srcAddr].life = 'alive';
					self.emit('reachable ' + buf.srcAddr.toString(), true);
				} else {
					logger.warn('Discovered new device which is not in the database - ' + JSON.stringify(buf));
					//Wait for 5 seconds and see if the device announces itself. If not then request simple descriptor response
					// setTimeout(function() {
					// 	if(typeof self.nodes[buf.srcAddr] === 'undefined') {
					// 		logger.info('Device still not discovered, explicitly requesting simple descriptor...');
					// 		self.endDeviceAnnce({srcAddr: buf.srcAddr, nwkAddr: buf.srcAddr});
					// 	}
					// }, 5000);
				}
			}
		});

		// znp.onCriticalFailure(function() {
		// 	logger.error('Got critical error');
		// 	self.restart();
		// });

		// znp.onZnpReset(function() {
		// 	logger.error('ZNP reset');
		// 	self.restart();
		// });
	});
};

function startPermitDisconnectTimer(self, duration) {
	clearTimeout(self.permitTimer);
	self.permitTimer = setTimeout(function() {
		logger.info('Turning off permit join');
		self.addDevice(0); // 0 - turn off the permit mode
		self.permitMode = false;
		clearTimeout(self.permitTimer);
	}, duration * 1000);
}

/**
 * Send LQI request to all the known devices and accordingly report their reachability on response
 *
 * @method requestNetworkTopology
 */
ZNPController.prototype.requestNetworkTopology = function() {
	var self = this;
	if(this._enablePeriodicRefresh) {
		var lqiRequstTimer;
		var nodesNum = Object.keys(self.nodes).length;
		var topologyThrottleTimer = setInterval(function() {
			if(nodesNum > 0) {
				var addr = Object.keys(self.nodes)[nodesNum - 1];
				//To avoid false 'dead' readings, only declare dead after 3 consecutive rejects
				if(self.nodes[addr].life === 'alive') {
					self.lifeLine = Object.keys(self.nodes).length * self.lifeLineGradient;
					self.nodes[addr].lifeLine = self.lifeLine;
				}
				self.nodes[addr].life = 'may be dead';
				self.sendLqiRequest(addr).then(function() {
					logger.info('LIFE: LQI Request succesful for addr ' + dstAddr);
				}, function(err) {
					logger.error('LIFE: Periodic lqi request failed destination ' + addr + ' lifeline left ' + self.nodes[addr].lifeLine);
					// clearTimeout(lqiRequstTimer);
					// if(self.nodes[addr].life == 'may be dead') {
						// self.nodes[addr].life = 'alive';
						// self.emit('reachable ' + addr.toString(), true);
					// }
				});
				nodesNum--;
			} else {
				clearInterval(topologyThrottleTimer);
			}
		}, 250);

		lqiRequstTimer = setTimeout(function() {
			Object.keys(self.nodes).forEach(function(addr) {
				if(self.nodes[addr].life === 'may be dead') {
					logger.info('LIFE: node ' + addr + ' lifeline left ' + self.nodes[addr].lifeLine);
					if(self.nodes[addr].lifeLine-- <= 0) {
						self.nodes[addr].lifeLine = 0;
						self.nodes[addr].life = 'dead';
						self.emit('reachable ' + addr.toString(), false);
						logger.info('LIFE: Node ' + addr + ' is dead');
					}
				}
			});
		}, 8000);
	}
};

/**
 * Start periodic network all-link estimation
 *
 * @method startPeriodicNetworkRefresh
 * @param {Number} duration 0 indicate no network refresh (all-link estimation), otherwise minimum 30 seconds
 */
ZNPController.prototype.startPeriodicNetworkRefresh = function(duration) {
	var self = this;
	self._enablePeriodicRefresh = true;
	clearInterval(self.networkRefreshInterval);
	self.networkRefreshInterval = setInterval(function() {
		logger.info('LIFE: Periodic network refresh, sending link quality request');
		self.requestNetworkTopology();
	}, duration)
}

/**
 * Stop periodic network all-link estimation
 *
 * @method stopNetworkRefresh
 */
ZNPController.prototype.stopNetworkRefresh = function() {
	this._enablePeriodicRefresh = false;
	clearInterval(this.networkRefreshInterval);
}

/**
 * Enable permit join (commissioning) for specified duration
 *
 * @method addDevice
 * @param {Number} duration commissioning duration
 * @return {Promise} The success handler accepts no parameter. The failure
 *  handler accepts a single error object.
 */
ZNPController.prototype.addDevice = function(duration) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.znp.addDevice(duration, function() {
			logger.info('Permit join successful, opening device for duration '+ duration);
			if(duration > 0) {
				self.permitMode = true;
            	self.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.SEARCHING);
				startPermitDisconnectTimer(self, duration);
			} else {
				self.permitMode = false;
			}
			resolve();
		}, function() {
            self.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.PERMIT_FAILED);//progress negative means failed, abort and try again
			logger.error('Permit join call failed');
			reject();
		});
	});
};

/**
 * Call this after start, this instantiate serial communication interface
 *
 * @method connect
 * @return {Promise} The success handler accepts no parameter. The failure
 *  handler accepts a single error object.
 */
ZNPController.prototype.connect = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.znp.connect(self.siodev, function(buf) {
			if(buf == true) {
				// self.permitMode = false;
				resolve();
			} else {
				reject();
			}
		});
	});
};

/**
 * Disconnect serial communication interface
 *
 * @method disconnect
 * @return {Promise} The success handler accepts no parameter. The failure
 *  handler accepts a single error object.
 */
ZNPController.prototype.disconnect = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.znp.disconnect(function() {
            self.setState(false);
            self.zclThrottleRequest = [];
            self.zclSetRequests = [];
            clearInterval(this.throttleInterval);
            self.stopNetworkRefresh();
			logger.info('ZNP Disconnected successfully');
			resolve();
		}, function() {
			logger.error('ZNP Unable to disconnect');
			reject();
		});
	});
};

/**
 * Generate random pan id
 *
 * @method generateNewPanId
 * @return {Number} random number ranging 0-65500
 */
ZNPController.prototype.generateNewPanId = function() {
	return Math.ceil(Math.random() * 65500);
};

/**
 * Set log level
 *
 * @method logLevel
 * @return {Number} level info- 2, debug- 3, trace- 4, error- 0, warn- 1
 */
ZNPController.prototype.logLevel = function(level) {
	if(typeof level === 'number' && level >= 0) {
		global.GLOBAL.ZigbeeLogLevel = level;
	}
};

/**
 * Represents the running state of the znp controller
 *
 * @method setState
 * @param {Boolean} state true=setup successful, false=otherwise
 */
ZNPController.prototype.setState = function(s) {
	this.state = s;
};

/**
 * Get current state of the znp controller
 *
 * @method getState
 * @return {Boolean} true=setup successful, false=otherwise
 */
ZNPController.prototype.getState = function() {
	return this.state;
};

/**
 * Used by multiplexer module to tag the commands from different device controllers
 *
 * @method getNextSeqId
 * @return {Number} sequential number, range 0-255
 */
ZNPController.prototype.getNextSeqId = function() {
	return (this._seqId++ & 0xFFFF);
};

/**
 * Return the config options with which zigbee network is setup
 *
 * @method getConfigOptions
 * @return {Object} config options
 */
ZNPController.prototype.getConfigOptions = function() {
	return this.configuration;
};

ZNPController.prototype.uptickRebootCounter = function() {
	this.rebootCounter++;
	if(this.rebootCounter > 25) {
		this.rebootCounter = 0;
		this.restart();
	}
};

ZNPController.prototype.resetRebootCounter = function() {
	this.rebootCounter = 0;
};

ZNPController.prototype.getZclQueuelength = function() {
	return this.zclThrottleRequest.length;
};

// ZNPController.prototype.updateLifeline = function(value) {
// 	if(typeof value === 'number') {
// 		self.lifeLine = value;	
// 	}
// };

/**
 * Start the throttler at throttle rate specified during instantiation
 *
 * @method throttleWorkRequest
 */
ZNPController.prototype.throttleWorkRequest = function() {
	var self = this;
	self.throttleInterval = setInterval(function() {
		if(!self._zclWorkInProgress) {
			self._waitingTXCount = 0;
			var buf;
			if(self.zclSetRequests.length > 0) {
				logger.info('Found highest priority packet, executing this ahead of others...');
				buf = self.zclSetRequests.shift();
			} else {
				buf = self.zclThrottleRequest.shift();
			}
			if(buf) {
				if(buf.workCode !== DEFINES.WORK_CODE.ZCL_SEND_COMMAND) {
					var attrId = new Buffer(1);
					if(typeof buf.attrId === 'object') {
						attrId = new Buffer(buf.attrId.length * 2);
						buf.attrId.forEach(function(aId, index, array) {
							attrId.writeInt16BE(aId, index*2);
						});
					}
				}
				//Check if the node is alive, if it is then continue otherwise reject the packet
				if(self.nodes[buf.dstAddr].life !== 'dead') {
					logger.info('Sending REQUEST to znp of msgId ' + buf.msgId + ' seqNumber ' + buf.seqNumber);
					self.znp.doZCLWork(buf, buf.cmdFormat, attrId, function (status, msgId, seqNo) {
						logger.info('Got zcl work status- '+ zclWorkStatus[status] + ' for node '+ JSON.stringify(buf['dstAddr']) + ' of msgId ' + msgId +  ' seqNumber ' + seqNo);

						//TODO: dont check the status here, check if you are able to talk to the chip
						//Even response failure cannot differentiate whether devices are offline or chip is not working
						//We need something in the RPC layer which notifies if the comm fails
						if(zclWorkStatus[status] !== 'SUCCESS') {
							self.uptickRebootCounter();
						} else {
							self.resetRebootCounter();
						}
						// console.log('zclWorkResponseQueue ', self.zclWorkResponseQueue);
						if(typeof self.zclWorkResponseQueue[seqNo] !== 'undefined') {
							var buffer = self.zclWorkResponseQueue[seqNo].buffer;

							buffer.status = status;
							buffer.promise.resolve(msgId);

							if(zclWorkStatus[status] === 'SUCCESS') {
								self._zclWorkInProgress = true;
								self._waitingSeqNumber = buffer.seqNumber;
							}
						} else {
							logger.warn("THIS SHOULD NOT HAVE HAPPENED.... seqNumber " + seqNo + " Msg " + msgId);
						}
					});
				} else {
					buf.promise.reject('Node is found dead, dropping request');
				}
			}
		} else {
			logger.warn('ZCL work in progress, try again in next cycle...');
			self._waitingTXCount++;
			if(self._waitingTXCount > 10) {
				logger.error('ZCL work did not finish so resolving the waiting seqNumber ' + self._waitingSeqNumber);
				var seqId = self._waitingSeqNumber;
				self._zclWorkInProgress = false;
				if(typeof self.zclWorkResponseQueue[parseInt(seqId)] != 'undefined') {
					self.zclWorkResponseQueue[seqId]['status'] = 0x01;

					var buffer = self.zclWorkResponseQueue[seqId].buffer;

					buffer.status = 0x01;
					buffer.promise.reject('Did not get response from znp stack');

					/**
					* Fired when receive command response from the device
					*
					*	MT_RPC_SUCCESS = 0,         success
					*	MT_RPC_ERR_SUBSYSTEM = 1,   invalid subsystem
					*	MT_RPC_ERR_COMMAND_ID = 2,  invalid command ID
					*	MT_RPC_ERR_PARAMETER = 3,   invalid parameter
					*	MT_RPC_ERR_LENGTH = 4       invalid length
					*
					* @event message + nwkAddr
					* @param {Object} response command response
					*/
					self.emit('message ' + self.zclWorkResponseQueue[seqId].buffer.dstAddr, self.zclWorkResponseQueue[seqId]);
					delete self.zclWorkResponseQueue[seqId];

					//delete the previous work responses
					// Object.keys(self.zclWorkResponseQueue).forEach(function(seqNo) {
					// 	if(seqNo <= seqId) {
					// 		if(typeof self.zclWorkResponseQueue[seqNo] !== 'undefined') {
					// 			if(typeof self.zclWorkResponseQueue[seqNo]['status'] == 'undefined') {
					// 				logger.debug('deleting work response for seqid- '+ seqNo);
					// 				delete self.zclWorkResponseQueue[seqNo];
					// 			}
					// 		}
					// 	}
					// });
				} else {
					logger.error('Got nontracking seqNumber response: ' + seqId);
				}
			}
		}
	}, self.throttleRate);
};

/**
 * Helps modulate the throttle rate on fly
 *
 * @method newThrottleRate
 * @param {Number} rate new throttle rate in ms
 */
ZNPController.prototype.newThrottleRate = function(rate) {
	clearInterval(this.throttleInterval);
	this.throttleRate = rate;
	logger.info('Using throttleRate- '+ this.throttleRate);
	this.throttleWorkRequest();
};

ZNPController.prototype.restart = function() {
	var self = this;
	// this.permitMode = true;
	this.disconnect().then(function() {
		// self.connect();
		self.emit('restart');
	}, function(err) {
		logger.error('Failed to disconnect with error ' + err);
	});
	// this.emit('restart');
};

/**
 * Push work request to queue and inform throttler
 *
 * @method zclWork
 * @param {Object} buffer work request
 * @param {Number} msgId unique message id to track commands to devices
 * @param {Number} retries number of retries left
 * @return {Promise} The success handler accepts no parameter. The failure
 *  handler accepts a single error object.
 */
ZNPController.prototype.zclWork = function(buffer, msgId, retries, priority) {
	var self = this;
	var seqNo = buffer['seqNumber'];
	return new Promise(function(resolve, reject) {

		if(self.permitMode && buffer.clusterId !== DEFINES.CLUSTER_CLASS.GENERAL.BASIC) {
			logger.warn('In commissioning mode, dropping request...');
			return reject('Commissioning mode, dropping request!');
		}

		buffer['promise'] = {resolve: resolve, reject: reject};

		logger.debug('Sending buffer ' + JSON.stringify(buffer) + ' with seqNumber '+ seqNo);

		if(typeof self.zclWorkResponseQueue[seqNo] == 'undefined') {
			self.zclWorkResponseQueue[seqNo] = {};
		}

		self.zclWorkResponseQueue[seqNo] = {
			'buffer': buffer
		};

		logger.debug('Adding to work request queue '+  JSON.stringify(self.zclWorkResponseQueue[seqNo]));

		if(typeof priority !== 'undefined' && priority === 'highest') {
			self.zclSetRequests.push(buffer);
		} else {
			self.zclThrottleRequest.push(buffer);	
		}
	});
};

/**
 * IMPORTANT!! Universal parser to any attribute response of any data type.
 *
 * More Info: Refer latest Zigbee Cluster Library- Data Types section.
 *
 * @method parseAttrResponse
 * @param {Object} response attribute response received from the device
 * @return {Object} parsed response based on the data type
 */
ZNPController.prototype.parseAttrResponse = function(data) {
	var self = this;
	var response = new Buffer(data);
	var buf = {};
	var index = 0;
	// //console.log('Response length ', response.length);
	while(index <= (response.length-1)) {
		// //console.log("index ", index);
		try {
			var attrId = response.readUInt16LE(index);
			//console.log('\t\tattrId ', attrId);
			if(typeof buf[attrId] === 'undefined') {
				buf[attrId] = {};
			}
			buf[attrId]['attrId'] = attrId;
			index += 2;
			buf[attrId]['status'] = response.readUInt8(index);
			//console.log('status ', buf[attrId]['status']);
			buf[attrId]['statusCode'] = DEFINES.STATUS[buf[attrId]['status']];
			if(buf[attrId]['status'] == 0x00) { //success
				index += 1;
				buf[attrId]['dataType'] = response.readUInt8(index);
				//console.log('dataType ', buf[attrId]['dataType']);
				if(typeof DEFINES.DATA_TYPE[buf[attrId]['dataType']] !== 'undefined') {
					//Datatype handler
					var dt = DEFINES.DATA_TYPE[buf[attrId]['dataType']];
					buf[attrId]['type'] = dt.type;
					//console.log('type ', buf[attrId]['type']);
					if(typeof dt.len !== 'undefined') {
						if(typeof dt.len === 'number') {
							index += 1;
							buf[attrId]['value'] = response.readIntLE(index, dt.len);
							index += dt.len;
							//console.log('value ', buf[attrId]['value']);
						} else if(typeof dt.len === 'string') {
							if(dt.len == '1') {
								index += 1;
								var len = response.readUInt8(index);
								//console.log('len ', len);
								index += 1;
								buf[attrId]['value'] = response.slice(index, index + len).toString('ascii').trim();
								//console.log('value ', buf[attrId]['value']);
								index += len;
							} else if(dt.len == '2') {
								index += 1;
								var len = response.readUInt16LE(index);
								//console.log('len ', len);
								index += 2;
								buf[attrId]['value'] = response.slice(index, index + len).toString('ascii').trim();
								//console.log('value ', buf[attrId]['value']);
								index += len;
							} else if(dt.len == '2+') {
								index += 1;
								buf[attrId]['value'] = response.slice(index);
								//console.log('value ', buf[attrId]['value']);
								index += buf[attrId]['value'].length;
							} else {
								buf[attrId]['error'] = 'UNHANDLED LENGTH VALUE- ' + dt.len;
							}
						} else {
							buf[attrId]['error'] = 'UNHANDLED LENGTH TYPE- ' + (typeof dt.len);
						}
					} else {
						//length not defined
						index += 1;
						buf[attrId]['value'] = response.slice(index);
						//console.log('value ', buf[attrId]['value']);
						index += buf[attrId]['value'].length;
					}
					if(typeof dt.invalidNumber !== 'undefined') {
						if(buf[attrId]['value'] == dt.invalidNumber) {
							buf[attrId]['error'] = 'INVALID NUMBER';
						}
					}
				} else {
					self.logger.error('Got UNKNOWN Data type');
					buf[attrId]['error'] = 'UNKNOWN DATA TYPE';
				}
			} else {
				index++;
			}
		} catch(e) {
			logger.error('parseAttrResponse failed with error- ' + e);
			// process.exit(1);
			buf[attrId]['error'] = e;
			break;
		}
	}
	
	delete response;
	return buf;
}

/**
 * IMPORTANT!! Formats outgoing data to attribute data type
 *
 * @method formatWriteAttrData
 * @param {Number} data outgoing data need formatting
 * @param {String} type data type of outgoing data
 * @return {Number} formattedData data formatted on input data type
 */
ZNPController.prototype.formatWriteAttrData = function(data, type) {
	var self = this;
	return new Promise(function(resolve, reject) {
		try {
			var dataType = DEFINES.DATA_TYPE[self.getDataType(type)];
			if(typeof dataType.len == 'number') {
				var buf = new Buffer(dataType.len);
				if(dataType.type.indexOf('UINT') > -1) { //unsigned integer
					buf.writeUIntLE(data, 0, dataType.len);
				} else { //signed integer
					buf.writeIntLE(data, 0, dataType.len);
				}
				resolve(buf);
				delete buf;
			} else {
				// logger.error('Not yet supported string len data type');
				reject(new Error('Not yet supported string len data type'))
			}
		} catch(e) {
			logger.error('formatWriteAttrData failed with error- ' + JSON.stringify(e));
			reject(e);
		}
	});
}


ZNPController.prototype.getDataType = function(type) {
	for(var i = 0; i < Object.keys(DEFINES.DATA_TYPE).length; i++) {
		if(DEFINES.DATA_TYPE[Object.keys(DEFINES.DATA_TYPE)[i]].type == type) {
			return Object.keys(DEFINES.DATA_TYPE)[i]/1;
		}
	}
}

ZNPController.prototype.getNodeManufacturerInformation = function(nodeId, nodeInfo) {
	logger.info('Lets identify node '+ nodeInfo.nwkAddr.toString(16));
    var self = this;
    var basicCluster;

    return new Promise(function(resolve, reject) {
		// startPermitDisconnectTimer(self, 1);

		var multiplexer = new Multiplexer(self, nodeId);
		multiplexer.start().then(function() {
			logger.trace('Started multiplexer for retrieving basic cluster info for nodeId ' + nodeId);
			return basicCluster = new BasicCluster({znpController: self, nodeId: nodeInfo.nwkAddr, endPoint: nodeInfo.endpoint, multiplexer: multiplexer});
		}).then(function() {
			basicCluster.getDeviceInformation().then(function(info) {
				if(typeof self.nodes[nodeId] != 'undefined') {
					Object.keys(info).forEach(function(key) {
						self.nodes[nodeId][key] = info[key];
					});
				} else {
					logger.error('In identifyOnboardedNode, this should not have happened, critical error!');
				}

				/**
				* Once manufacturing information is extracted from the device
				*
				* @event node identified
				* @param {Number} nwkAddr network address of the device
				* @param {Object} metadata updated metadata of the device
				*/
		    	self.emit('node identified', nodeInfo.nwkAddr, self.nodes[nodeInfo.nwkAddr]);
		    	resolve();
			});
		});
	});
}


/**
 * Get basic cluster attributes, manufacturing information which lets us identify the device controller and facades
 *
 * @method identifyDiscoveredNode
 * @param {Number} nwkAddr device network address
 * @param {Object} metadata node info of the device
 * @return {Promise} The success handler accepts no parameter. The failure
 *  handler accepts a single error object.
 */
ZNPController.prototype.identifyDiscoveredNode = function(nodeId, nodeInfo) {
    // query BASIC Cluster to get device information (signature)
    logger.info('Lets identify node '+ nodeInfo.nwkAddr.toString(16));
    var self = this;
    var attrId = 0;
    var basicCluster;
    var infoTimer;

    if(self.identificationInProgress) {
    	logger.warn('Identification already in progress, deferring discovery for nodeId ' + nodeId);
    	self.identificationQueue[nodeId] = nodeInfo;
    	return;
    }

    return new Promise(function(resolve, reject) {
		// startPermitDisconnectTimer(self, 1);

		var multiplexer = new Multiplexer(self, nodeId);
		multiplexer.start().then(function() {
			logger.trace('Started multiplexer for retrieving basic cluster info for nodeId ' + nodeId);
			return basicCluster = new BasicCluster({znpController: self, nodeId: nodeInfo.nwkAddr, endPoint: nodeInfo.endpoint, multiplexer: multiplexer});
		}).then(function() {
			basicCluster.removeAllListeners('newNodeAttrResponse ' + nodeId);
			basicCluster.on('newNodeAttrResponse ' + nodeId, function(info) {
				// logger.info('Got info ' + JSON.stringify(info));
				if(typeof self.nodes[info.srcAddr] != 'undefined') {
					var respBuf = info.payload;
					if(info.clusterId == DEFINES.CLUSTER_CLASS.GENERAL.BASIC) {
						// logger.info("*********** ATTRIBUTE RESPONSE " + JSON.stringify(respBuf) + " **************");
						if(respBuf['status'] == 0x00) {
							if(typeof basicClusterAttributeId[respBuf['attrId']] !== 'undefined')  {
								if(typeof respBuf['value'] !== 'undefined') {
									self.nodes[info.srcAddr][basicClusterAttributeId[respBuf['attrId']]] = respBuf['value'];
									logger.info('Response attribute ' + basicClusterAttributeId[respBuf['attrId']] + ' value- ' + respBuf['value']);
								} else {
									logger.error('Got attribute response but something went wrong- ' + JSON.stringify(respBuf));
								}
							} else {
								logger.warn('Unhandled attribute '+ JSON.stringify(respBuf));
							}
						} else {
							logger.warn('Device do not support this attribute- ' + JSON.stringify(respBuf));
						}
						callNextAttribute();
					} else {
						//based on the cluster Id report the data to its cluster class
						logger.info('Got data from cluster other than basic- '+ JSON.stringify(info));
					}
				} else {
					logger.error('In onAttrResponse, this should not have happened, critical error- '+ JSON.stringify(info));
				}
			});
		}).then(function() {
			self.identificationInProgress = true;
			callNextAttribute();
			clearTimeout(self.identificationInProgressTimer);
			self.identificationInProgressTimer = setTimeout(function() {
				self.identificationInProgress = false;
			}, 30000);
		});

		function startStopWatch(id) {
			infoTimer = setTimeout(function() {
		  		//Above is not required because we are implementing generic controller
				logger.warn('Timed out, getting device attribute info for attribute- '+ id + ' Continuing anyways...');
	    		callNextAttribute();
			}, 5000);
		}

		function callNextAttribute() {
			clearTimeout(infoTimer);
	    	if(attrId <= 7) {
	    		logger.info('Requesting attribute '+ attrId + ' from node '+ nodeInfo.nwkAddr.toString(16));
				basicCluster.get(attrId++).then(function() {
					startStopWatch(attrId - 1);
				}, function(err) {
					self.identificationInProgress = false;
					clearTimeout(self.identificationInProgressTimer);
					if(Object.keys(self.identificationQueue).length > 0) {
						var nId = Object.keys(self.identificationQueue)[0];
						logger.warn('Continuing identification for device in queue ' + nId);
						self.identifyDiscoveredNode(nId, self.identificationQueue[nId]);
						delete self.identificationQueue[nId];
					}
					logger.error('Failure, basic cluster get failed at attribute- ' + (attrId - 1) + ' error- '+ err);
				});
	    	} else {
	    		logger.info('Node identification complete');
				delete basicCluster;
				delete multiplexer;
				self.identificationInProgress = false;
				clearTimeout(self.identificationInProgressTimer);
				if(Object.keys(self.identificationQueue).length > 0) {
					var nId = Object.keys(self.identificationQueue)[0];
					logger.warn('Continuing identification for device in queue ' + nId);
					self.identifyDiscoveredNode(nId, self.identificationQueue[nId]);
					delete self.identificationQueue[nId];
				}

				/**
				* Once manufacturing information is extracted from the device
				*
				* @event node identified
				* @param {Number} nwkAddr network address of the device
				* @param {Object} metadata updated metadata of the device
				*/
		    	self.emit('node identified', nodeInfo.nwkAddr, self.nodes[nodeInfo.nwkAddr]);
		    	resolve();
	    	}
		}
    });
}

/**
 * Device announcment, informs TI Stack about onboarded devices on reboot
 *
 * @method endDeviceAnnce
 * @param {Object} nodeInfo Zigbee node information containing src and network address
 * @return {Promise} The success handler accepts no parameter. The failure
 *  handler accepts a single error object.
 */
ZNPController.prototype.endDeviceAnnce = function(nodeInfo) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.znp.endDeviceAnnce({srcAddr: nodeInfo.srcAddr, nwkAddr: nodeInfo.nwkAddr}, function() {
			logger.info('endDeviceAnnce successful');
			resolve();
		}, function() {
			logger.error('endDeviceAnnce call failed for srcAddr ' + nodeInfo.srcAddr);
			reject();
		});
	});
}

/**
 * CAUTION!! This will delete the existing zigbee database
 *
 * @method deleteZigbeeDatabase
 */
ZNPController.prototype.deleteZigbeeDatabase = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
    	Object.keys(self.nodes).forEach(function(id) {
    		ddb.local.delete('zigbeeHA:devices.' + id).then(function() {
	            logger.info('Deleted zigbee device ' + id);
	            delete self.nodes[id];
	        }, function(e) {
	            logger.error('Could not delete device- ' + JSON.stringify(e));
	        });
    	})

        //Just precautionary, if not found in the database but registerd with devicejs
        dev$.select('id=*').listResources().then(function(resources) {
            Object.keys(resources).forEach(function(id) {
                if(resources[id].type.indexOf('Zigbee') > 0) {
                    dev$.forgetResource(id).then(function() {
                        logger.info('Deleted resource- ' + id + ' succesfully');
                    });
                }
            });
            self.topology = {};
            resolve('Zigbee database cleared successfully!');
        });
    });
}

/**
 * CAUTION!! This will delete the existing zigbee database and reboot the network
 *
 * @method factoryReset
 */
ZNPController.prototype.factoryReset = function() {
	/**
	* This will delete the existing zigbee database and reboot the network
	*
	* @event factoryReset
	*/
	this.emit('factoryReset');
}

/**
 * CAUTION!! If new network then this will destory the existing network on reboot and start new network on specified pan and channel
 *
 * @method restartModule
 * @param {Boolean} newNwk true=new, false=restore
 * @param {Number} panId new pan id of the network
 * @param {Number} channel new channel of the network
 */
ZNPController.prototype.restartModule = function(newNwk, panId, channel) {
	/**
	* If new network then this will destory the existing network on reboot and start new network on specified pan and channel
	*
	* @event restartModule
	* @param {Boolean} newNwk true=new, false=restore
	* @param {Number} panId new pan id of the network
	* @param {Number} channel new channel of the network
	*/
	this.emit('restartModule', newNwk, panId, channel);
}

/**
 * Get non-volatile item value of ZNP stack
 *
 * @method getNVItem
 * @param {Number} nvId non-volatile item id
 * @return {Object} Returns the value of the item requested
 */
ZNPController.prototype.getNVItem = function(id) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.znp.getNVItem(id, function(info, data) {
			logger.info('NV item request successful, info ' + JSON.stringify(info) + ' data- ' + JSON.stringify(data));
			if(info.status == 0x00) {
				resolve(data);
			} else {
				reject('Failed with error status ' + info.status);
			}
		}, function(err) {
			logger.error('NV Item get failed- '+ JSON.stringify(err));
			reject(JSON.stringify(err));
		});
	});
}

/**
 * Set any non-volatile item of ZNP stack, check defs for more info
 *
 * @method setNVItem
 * @param {Number} nvId non-volatile item id
 * @param {Number} value new value of the item
 * @return {Promise} The success handler accepts no parameter. The failure
 *  handler accepts a single error object.
 */
ZNPController.prototype.setNVItem = function(id, value) {
	var self = this;
	return new Promise(function(resolve, reject) {
		if(typeof value !== 'object') {
			return reject(new Error('value should be of type object'));
		}
		self.znp.setNVItem(id, value.length, value, function() {
			logger.info('NV item set successful- '+ id + ' value ' + value);
			resolve();
		}, function(err) {
			logger.error('Could not set NV Item - '+ id + ' error- ' + JSON.stringify(err));
			reject(JSON.stringify(err));
		});
	});
}

/**
 * Explicit command to send LQI request to particular device
 *
 * @method sendLqiRequest
 * @param {Number} nwkAddr specify the network address of the device for which LQI is directed
 * @return {Promise} The success handler accepts no parameter. The failure
 *  handler accepts a single error object.
 */
ZNPController.prototype.sendLqiRequest = function(dstAddr) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.znp.sendLqiRequest(dstAddr || 0x0000, function() {
			resolve();
		}, function(err) {
			logger.error('LQI Request failed '+ JSON.stringify(err));
			reject(JSON.stringify(err));
		});
	});
}

/**
 * Get latest known network topology
 *
 * @method getNetworkTopology
 * @return {Object} network topology with device types of the onboarded devices
 */
ZNPController.prototype.getNetworkTopology = function() {
	return this.topology;
}

/**
 * Get all the onboarded nodes metadata
 *
 * @method getNodes
 * @return {Object} metadata of all the devices
 */
ZNPController.prototype.getNodes = function() {
	return this.nodes;
}

/**
 * Get life status of each node in ZigBee network
 *
 * @method getStatus
 * @return {Object} status life status of all the nodes
 */
ZNPController.prototype.getStatus = function() {
	var ret = {};
	var self = this;
	Object.keys(self.nodes).forEach(function(addr) {
		ret[addr] = {life: self.nodes[addr].life, name: self.nodes[addr].resourceID};
	});
	return ret;
}

/**
 * Evaluate operation on input data
 *
 * @method evalOperation
 * @param {Number} inputData input data on which operation will be performed
 * @param {String} operation operation with handlebars
 * @return {Number} outputData return evaluated operation result upto 2 decimal places
 */
ZNPController.prototype.evalOperation = function(inputData, operation) {
	logger.debug('Got evalOperation on inputData- ' + inputData + ' operation ' + JSON.stringify(operation));
	var template = handleBars.compile(JSON.stringify(operation));
    var info = {};
    info.value = inputData;
    var outputData = eval(JSON.parse(template(info)));
    return (typeof outputData === 'string') ? outputData : outputData.toFixed(2)/1;
}

module.exports = {
	ZNPController: ZNPController
};
