/*
* Copyright (c) 2019, Arm Limited and affiliates.
* SPDX-License-Identifier: Apache-2.0
*
* Licensed under the Apache License, Version 2.0 (the “License”);
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an “AS IS” BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var RssiController = require('./../controllers/SignalStrength/SignalStrength');
var rssi = new RssiController();
var uuids = [];
var controllers = {};
var peripheral = {};
const Logger = require('./../utils/logger');
const logger = new Logger({
	tag: 'Warden',
	color: 'blue'
});
const SupportedDevices = require('./supportedDevice.json');

var connecteddevice = [];
var interval = null;

var Warden = function(options) {
	var self = this;
	this._ble = options.ble;
	this._deviceController = {};
	this._onboardedDevices = [];
	this._createControllerQueue = [];
	this._retryCreatingDeviceController = {};
};

Warden.prototype.start = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.monitorOnboardedDevices();
		ddb.shared.get('BluetoothDriver.onboarded').then(function (data) {
			try {
				self._onboardedDevices = JSON.parse(data.siblings);
				resolve();
			} catch(err) {
				self._onboardedDevices = [];
				logger.error("Got error in reteriving the onboarded devices " + err);
				reject(err);
			}
		});
	});
};

Warden.prototype.createController = function(uuid) {
	var self = this;
	return new Promise(function(resolve, reject) {
		if(self._createControllerQueue.indexOf(uuid) > -1) {
			self._retryCreatingDeviceController[uuid]++;
			if(self._retryCreatingDeviceController[uuid] > 10) 
				self._createControllerQueue.splice(self._createControllerQueue.indexOf(uuid), 1);
			logger.warn("Creating controller for " + uuid + " is in progress!");
			return reject();
		}
		// if(!self._deviceController[uuid]) {
			try {
				self._createControllerQueue.push(uuid);
				self._retryCreatingDeviceController[uuid] = 0;
				self.startCreatingController(uuid).then(function() {
					self._createControllerQueue.splice(self._createControllerQueue.indexOf(uuid), 1);
					resolve();
				}, function(err) {
					self._createControllerQueue.splice(self._createControllerQueue.indexOf(uuid), 1);
					logger.error("Failed to create controller " + err);
					reject(err);
				});
			} catch(err) {
				self._createControllerQueue.splice(self._createControllerQueue.indexOf(uuid), 1);
				logger.error("Catch failed to create controller " + err);
				reject(err);
			}
		// } else {
  //       	logger.warn("Device controller already exists!");
  //           self._deviceController[uuid]._subscribeToStates();
  //       	resolve("Device controller already exists!");
		// }
	});
};

Warden.prototype.createSignalStrengthController = function (uuids, peripheral, timer) {
	return uuids.forEach(uuid => {
		if (peripheral[uuid] == 'undefined') {
			return Promise.reject("Enter the UUID of nearby ble device");
		}
		rssi.create("BLEDevice-" + uuid, peripheral[uuid].rssi).then(devController => {
			controllers[uuid] = devController;
			//console.log(constrollers[uuid]);
		}, err => {
			console.log(err);
		});
		var polltime = timer;
		updateRSSI(uuids, polltime);
	});
};

Warden.prototype.updateRSSI = function (uuids, polltime) {
	interval = setInterval(function () {
		return uuids.forEach(uuid => {
			ble.startScan([], true, 10000).then(function () {
				setTimeout(function () {
					if (ble.getPeripheral(uuid) == undefined) {
						if (controllers[uuid] == undefined) return;
						else {
							controllers[uuid]._rssi = -150;
						}
						return;
					} else {
						var rssi = ble.getPeripheral(uuid).rssi;
						//console.log(rssi)
						controllers[uuid]._rssi = rssi;
						dev$.publishResourceStateChange("BLEDevice-" + uuid, "rssi", rssi);
					}
				}, 10000);
			}, (err) => {
				logger.warn(err);
			});
		});
	}, polltime);
};

Warden.prototype.stopRSSI = function (uuids) {
	clearInterval(interval);
	uuids.forEach(uuid => {
		logger.warn("Trying to unregister controller with uuid-" + uuid);
		if (controllers[uuid] == undefined) {
			logger.warn("Controller not found " + uuid);
		}
		controllers[uuid].stop();
		delete controllers[uuid];
		logger.warn("Controller unregistered successfully!");
	});
};

function isSupported(device) {
	return new Promise(function(resolve, reject) {
		try {
			for(var i = 0; i < SupportedDevices.length; i++) {
				if(SupportedDevices[i].name == device.name || SupportedDevices[i].advertisementServiceUuid == device.advertisement.serviceUuids) {
					return resolve(SupportedDevices[i]);
				}
			}
			return reject('Device is not supported!');
		} catch(err) {
			reject("Device is not supported " + JSON.stringify(err));
		}
	});
}

Warden.prototype.stopController = function(uuid) {
	if(this._deviceController[uuid]) {
		this._deviceController[uuid].stop();
		this._deviceController[uuid] = null;
		this._onboardedDevices.splice(this._onboardedDevices.indexOf(uuid), 1);
		ddb.shared.put('BluetoothDriver.onboarded', JSON.stringify(this._onboardedDevices));
		return Promise.resolve();
	} else {
		this._onboardedDevices.splice(this._onboardedDevices.indexOf(uuid), 1);
		ddb.shared.put('BluetoothDriver.onboarded', JSON.stringify(this._onboardedDevices));
		return Promise.reject("No device controller found for this device!");
	}
};


Warden.prototype.monitorOnboardedDevices = function() {
	var self  = this;
	if(!this._monitoringOnboardedDevices) {
		logger.info("STARTING TO MONITOR THE ONBOARDED DEVICES!");
		this._monitoringOnboardedDevices = true;
		self._ble.on('ble-discovered-devices', function(peripherals) {
			var devices = JSON.parse(peripherals);
			// console.log("Found devices " + Object.keys(devices));
			Object.keys(devices).forEach(function(uuid) {
				if(devices[uuid] && devices[uuid].state == "disconnected" && self._onboardedDevices.indexOf(uuid) > -1) {
					if(!self._deviceController[uuid] || !self._deviceController[uuid]._connected) {
						logger.info("Go create controller for - " + uuid);
						try {
							self.createController(uuid);
						} catch(err) {
							logger.error("Failed to create controller " + err);
						}
						// if(!self._createControllerInProgress[uuid]) {
						// 	self._createControllerInProgress[uuid] = true;
						// 	logger.info("Creating controller for --- " + uuid);
						// 	console.log(self._createControllerInProgress);
						// 	self.createController(uuid).then(function() {
						// 		self._createControllerInProgress[uuid] = false;
						// 	}, function() {
						// 		self._createControllerInProgress[uuid] = false;
						// 	});
						// 	//temporary fix
						// 	setTimeout(function() {
						// 		self._createControllerInProgress[uuid] = false;
						// 	}, 10000);
						// } else {
						// 	logger.warn("Device controller creation is in progress!");
						// }
					}
				}
			});
		});
		setInterval(function() {
			self._onboardedDevices.forEach(function(uuid) {
				if(!self._deviceController[uuid] || !self._deviceController[uuid]._connected) {
					logger.info("Looking for device - " + uuid);
					self._ble.startScan(["ef6801009b3549339b1052ffa9740042", "000000018dd44087a16a04a7c8e01734"], false, 10000).then(function () {
					}, (err) => {
						logger.warn(err);
					});
				}
			});
		}, 10000);
	}
};

Warden.prototype.startCreatingController = function(uuid) {
	var self = this;
	return new Promise(function(resolve, reject) {
		//Check if we support this device
		logger.info("1");
		var peri = self._ble.getPeripheral(uuid);
		if(!peri) {
			reject("Unable to find the device. Please rescan!");
		}
		logger.info("2");
		return isSupported(peri).then(function(data) {
			logger.info("3");
			self._ble.connect(uuid).then(function() {
				logger.info("4");
				var deviceID = "BLE_" + (data.name.replace(' ', '') || "_Device") + "_" + peri.id;
				logger.info("Device " + deviceID + " is supported!");
				// console.log("Device is supported!" , data);
				//Add resource type
				var deviceController = require("./../" + data.controller);
				dev$.addResourceType(data.config).then(function() {
					logger.info("5");
		            dev$.listInterfaceTypes().then(function(interfaceTypes) {
		            	logger.info("6");
			            var devInterfaceStates = [];
			            data.config.interfaces.forEach(function(intf) {
			                if(typeof interfaceTypes[intf] !== 'undefined' && intf.indexOf("Facades") > -1) {
			                    try {
			                        devInterfaceStates.push(Object.keys(interfaceTypes[intf]['0.0.1'].state)[0]);
			                    } catch(e) {
			                        reject('Failed to parse interface ' + e);
			                    }
			                } else {
			                    console.log('\x1b[33m THIS SHOULD NOT HAVE HAPPENED. FOUND INTERFACE WHICH IS NOT SUPPORTED BY DEVICEJS ' + intf);
			                }
			            });
			            logger.info("7");
			            if(!self._deviceController[uuid]) {
			            	logger.info("8");
			            	logger.info("Creating device controller...");
				            Device = dev$.resource(data.config.name, deviceController);
				            self._deviceController[uuid] = new Device(deviceID);
				            var initStates = {};
				            logger.info("Starting device controller...");
				            self._deviceController[uuid].start({
				            	ble: self._ble,
				            	peripheralID: peri.id,
				                deviceID: deviceID,
				                services: data.uuids,
				                supportedStates: devInterfaceStates,
				                initStates: initStates || {}
				            }).then(function() {
				            	logger.info("9");
				                ddb.shared.put('WigWagUI:appData.resource.' + deviceID + '.name', deviceID);
				                if(self._onboardedDevices.indexOf(uuid) < 0) {
				                	logger.info("10");
				                	if(!self._onboardedDevices) self._onboardedDevices = [];
				                	self._onboardedDevices.push(uuid);
				                	ddb.shared.put('BluetoothDriver.onboarded', JSON.stringify(self._onboardedDevices));
				                }
				                self._deviceController[uuid]._connected = true;
				                self._deviceController[uuid]._subscribeToStates();
				                logger.info("Device controller created successfully with resource name - " + data.config.name);
								resolve("Device controller created successfully with resource name - " + data.config.name);
				            }, function(err) {
				            	logger.error("Error1: "+err);
				                reject(err);
				            });
				        } else {
				        	logger.warn("Device controller already exists!");
				        	self._deviceController[uuid]._connected = true;
				            self._deviceController[uuid]._subscribeToStates();
				        	resolve("Device controller already exists!");
				        }
			        });
		        }, function(err) {
		        	logger.error("Error2: "+err);
		            reject(err);
		        });
			}, function(err){
				logger.error("Error3: "+err);
				reject(err);
			});
		}, function(err) {
			logger.error("Error4: "+err);
			reject(err);
		});
	});
};


module.exports = Warden;