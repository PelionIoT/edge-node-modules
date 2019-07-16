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

/**
    @file src/start.js
    @brief Initialize noble
    @author Yash <yash@wigwag.com>
    @date 10/24/2018
**/

'use strict';
const noble = require('noble');
const Logger = require('./../utils/logger');
const helper = require('./../utils/helper').helper;
const EventEmitter = require('events').EventEmitter;
const stringify = require('json-stringify-safe')
const logger = new Logger({
	tag: 'BLE',
	color: 'blue'
});
const crypto = require('crypto'),
	algorithm = 'aes-128-cbc',
	password = 'd6F3Efeqd6F3Efeq';

const fs = require('fs');
var Warden = require('./warden');
var controllers = {}
var interval = null;
var RssiController = require('./../controllers/SignalStrength/SignalStrength.js');
var rssi = new RssiController();
//const supportedDevice = require('./supportedDevice.json');

var scanInterval = null;
// Structure of a peripheral
/* Peripheral storage
'35ace8f2f04f':
   Peripheral {
     _noble:
      Noble {
        initialized: true,
        address: '28:b2:bd:49:72:de',
        _state: 'poweredOn',
        _bindings: [Object],
        _peripherals: [Circular],
        _services: [Object],
        _characteristics: [Object],
        _descriptors: [Object],
        _discoveredPeripheralUUids: [Array],
        _events: [Object],
        _eventsCount: 4,
        _allowDuplicates: false },
     id: '35ace8f2f04f',
     uuid: '35ace8f2f04f',
     address: '35:ac:e8:f2:f0:4f',
     addressType: 'random',
     connectable: false,
     advertisement: 
      { localName: undefined,
        txPowerLevel: undefined,
        manufacturerData: <Buffer 06 00 01 09 20 02 da be bb 46 8a d0 c5 61 b6 93 c7 8a 0f 74 3e 96 55 97 bb 95 6b a3 b2>,
        serviceData: [],
        serviceUuids: [],
        solicitationServiceUuids: [],
        serviceSolicitationUuids: [] },
     rssi: -71,
     services: null,
     state: 'disconnected' },
*/


var BLE = function (options) {
	var self = this;
	this._state = 'unknown';
	this._peripherals = {};
	this._peripheral = {};
	this.devices = {};
	this._userdevices = [];
	this._neardevices = {};

	noble.on('stateChange', function (state) {
		logger.debug('BLE state-- ' + state);
		self._state = state;
	});
	noble.on('discover', function (peripheral) {
		// console.log(peripheral.state)
		//logger.info('Discovered device ' + peripheral.address + ' rssi ' + peripheral.rssi);
		logger.debug('Discovered device ' + peripheral.address + ' rssi ' + peripheral.rssi + ' ' + peripheral.advertisement.localName);

		self._peripherals[peripheral.uuid] = {
			name: peripheral.advertisement.localName,
			id: peripheral.id,
			uuid: peripheral.uuid,
			address: peripheral.address,
			addressType: peripheral.addressType,
			connectable: peripheral.connectable,
			advertisement: peripheral.advertisement,
			rssi: peripheral.rssi,
			services: peripheral.services,
			state: peripheral.state,
			supported: false,
		};

		self._peripheral[peripheral.uuid] = peripheral;
	});
};

BLE.prototype = Object.create(EventEmitter.prototype);

BLE.prototype.state = function () {
	return this._state;
};

BLE.prototype.getPeripherals = function () {
	return stringify(this._peripherals);
};

BLE.prototype.getPeripheral = function (uuid) {
	//console.log(this._peripheral[uuid]);
	return this._peripherals[uuid];
};

BLE.prototype.myAddress = function () {
	return noble.address;
};

noble.on('connect', function (err) {
	logger.warn('Got connect event ', err);
});

noble.on('disconnect', function () {
	logger.warn('Got disconnect event ', arguments);
});

noble.on('rssiUpdate', function () {
	logger.warn('Got rssiUpdate event ', arguments);
});

noble.on('warning', function (err) {
	logger.warn('Got warning from noble-- ' + err);
});
noble.on('scanStart', function () {
	//self._connecteddevices = JSON.parse(data.siblings);
	logger.info("Scanning start")

})
noble.on('scanStop', function () {
	logger.info("Scanning stop")
});

var clearFlag = false;

BLE.prototype.startScan = function (uuids, allowduplicate, timer) {
    var self = this;
	if (!(uuids instanceof Array)) {
		return Promise.reject('uuids should be of type array');
	}
	if (self._peripherals !== null) self._peripherals = {};
	return new Promise(function (resolve, reject) {
		logger.debug('Start scanning BLE...');
		noble.startScanning(uuids, !!allowduplicate, function (err, data) {
			if (err) {
				return reject('Failed to start with error ' + err + ' BLE state is- ' + self._state);
			}
			resolve();

			var eventInterval = setInterval(function() {
				self.emit("ble-discovered-devices", stringify(self._peripherals));
			}, 2000);

			//timer to stop the scan
			setTimeout(function () {
				clearInterval(eventInterval);
				self.stopScan();
			}, timer);
		});
	});
};

BLE.prototype.stopScan = function () {
	var self = this
	clearFlag = true;
	//ddb.shared.delete("BluetoothDriver.scanResult")
	// ddb.shared.delete("BluetoothDriver.scanResult")
	ddb.shared.put('BluetoothDriver.scanResult', stringify(this._peripherals));
	noble.stopScanning()
	//return noble.stopScanning();
};

function updateState(Peripheral, uuid, state) {
	var self = Peripheral;
	ddb.shared.get('BluetoothDriver.scanResult').then(function (data) {
		try {
			var neardevices = JSON.parse(data.siblings);
			if(neardevices[uuid]) {
				neardevices[uuid].state = state;
				ddb.shared.put('BluetoothDriver.scanResult', JSON.stringify(neardevices));
			} else {
				logger.warn('Device not found in the database! uuid=' + uuid);
			}
		} catch(err) {
			logger.error("Failed to update state " + err);
		}
	});
}

BLE.prototype.connect = function (peripheralUuid) {
	var self = this;
	var peripheral = self._peripheral[peripheralUuid];

	if(!peripheral) return Promise.reject('Not found in the database!');

	peripheral.removeAllListeners('connect');
	peripheral.on('connect', function () {
		logger.info("connected " + peripheralUuid);
		updateState(self, peripheralUuid, true);
		self.emit('connect-'+peripheralUuid, null);
		self.stopScan();
	});

	peripheral.removeAllListeners('disconnect');
	peripheral.on('disconnect', function () {
		logger.warn("disconnected " + peripheralUuid);
		updateState(self, peripheralUuid, false);
		self.emit('disconnect-'+peripheralUuid, null);
	});

	return new Promise(function (resolve, reject) {
		if (peripheral.state == 'connected') {
			logger.warn('Already connected!');
			return reject('Already connected!');
		}

		self._peripheral[peripheralUuid].once('connect', function (err) {
			if (err) {
				return reject("Failed " + err);
			}
			logger.info('Connected successfully. Now discovering services and characteristics!');
			self.discoverAllServicesAndCharacteristics(peripheralUuid).then(function () {
				logger.info('Discovered services and characteristics for ' + peripheralUuid);
				self._peripherals[peripheralUuid].services = [];
				self._peripheral[peripheralUuid].services.forEach(function (eachService) {
					var characteristics = [];
					eachService.characteristics.forEach(function (eachCharacter) {
						characteristics.push({
							uuid: eachCharacter.uuid,
							name: eachCharacter.name,
							type: eachCharacter.type,
							properties: eachCharacter.properties,
							descriptors: eachCharacter.descriptors
						});
					});
					self._peripherals[peripheralUuid].services.push({
						uuid: eachService.uuid,
						name: eachService.name,
						type: eachService.type,
						includedServiceUuids: eachService.includedServiceUuids,
						characteristics: characteristics
					})

					resolve("Connected successfully!");
				});
			}, function (err) {
				return reject("Failed " + err);
			});
		});

		self._peripheral[peripheralUuid].connect(function (err) {
			if (err) {
				return reject('Failed to connect ' + err);
			}
		}, function(err) {
			console.log(err)
			return reject(err);
		});
	});
};

BLE.prototype.disconnect = function (peripheralUuid) {
	var self = this;
	logger.warn('got disconnect command')
	updateState(self, peripheralUuid, false)
	return new Promise(function (resolve, reject) {
		self._peripheral[peripheralUuid].disconnect(function (error) {
			if (error) {
				reject('Not able to disconnect')
			}
			resolve('disconnected');
		})
	})
}


BLE.prototype.discoverServices = function (peripheralUuid) {
	var self = this;
	return self._peripherals[peripheralUuid].services
}

BLE.prototype.encrypt = function (buffer) {
	try {
		var cipher = crypto.createCipher(algorithm, password)
		var crypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
		//console.log(crypted.toString())
		return crypted;
	} catch (err) {
		console.error('Failed ', err);
	}
}

BLE.prototype.decrypt = function (buffer) {
	var decipher = crypto.createDecipher(algorithm, password)
	var dec = Buffer.concat([decipher.update(buffer), decipher.final()]);
	//console.log("Decrypted " + dec.toString())
	return dec;
}

BLE.prototype.discoverCharacteristics = function (peripheralUuid, serviceNo) {
	var self = this;
	for (var i in self._peripherals[peripheralUuid].services) {
		console.log(self._peripherals[peripheralUuid].services[serviceNo].characteristics);
	}
	return self._peripherals[peripheralUuid].services[serviceNo].characteristics
}

BLE.prototype.getService = function(peripheralUuid, serviceNo) {
	var service = this._peripheral[peripheralUuid].services.filter(serv => serv.uuid == serviceNo);
	if(service.length > 0) {
		serviceNo = this._peripheral[peripheralUuid].services.indexOf(service[0]);
	}
	return serviceNo;
};

BLE.prototype.getCharacteristics = function(peripheralUuid, serviceNo, CharacteristicNo) {
	var character = this._peripheral[peripheralUuid].services[serviceNo].characteristics.filter(chara => chara.uuid == CharacteristicNo);
	if(character.length > 0) {
		CharacteristicNo = this._peripheral[peripheralUuid].services[serviceNo].characteristics.indexOf(character[0]);
	}
	return CharacteristicNo;
};

BLE.prototype.writeCharacteristic = function (peripheralUuid, serviceNo, CharacteristicNo, ackflag, message) {
	var self = this;
	return new Promise(function (resolve, reject) {
		//Check if the service and characteristics is uuid or not
		// console.log(self._peripheral[peripheralUuid].services);
		if(serviceNo.length > 3) {
			serviceNo = self.getService(peripheralUuid, serviceNo);
			if(serviceNo == -1) {
				reject('Serivce not available! Got - ' + serviceNo);
				return;
			}
		}
		// console.log(self._peripheral[peripheralUuid].services[serviceNo].characteristics);
		if(CharacteristicNo.length > 3) {
			CharacteristicNo = self.getCharacteristics(peripheralUuid, serviceNo, CharacteristicNo);
			if(CharacteristicNo == -1) {
				reject('Characteristic not available! Got - ' + CharacteristicNo);
				return;
			}
		}

		self._peripheral[peripheralUuid].services[serviceNo].characteristics[CharacteristicNo].write(message, !!ackflag, function (error) {
			//true is because I am not expecting a ack from service
			if (error) {
				return reject('Error in sending message ' + error);
			}
			resolve('Data sent successfully');
		});
	});
};


BLE.prototype.readCharacteristic = function (peripheralUuid, serviceNo, CharacteristicNo) {
	var self = this;
	return new Promise(function (resolve, reject) {
		if(serviceNo.length > 3) {
			serviceNo = self.getService(peripheralUuid, serviceNo);
			if(serviceNo == -1) {
				reject('Serivce not available! Got - ' + serviceNo);
				return;
			}
		}
		// console.log(self._peripheral[peripheralUuid].services[serviceNo].characteristics);
		if(CharacteristicNo.length > 3) {
			CharacteristicNo = self.getCharacteristics(peripheralUuid, serviceNo, CharacteristicNo);
			if(CharacteristicNo == -1) {
				reject('Characteristic not available! Got - ' + CharacteristicNo);
				return;
			}
		}

		self._peripheral[peripheralUuid].services[serviceNo].characteristics[CharacteristicNo].read(function (error, data) {
			if (error) {
				return reject('Error in receiving message ' + error);
			}
			resolve(data);
		});
	});
};


BLE.prototype.notifyCharacteristics = function (peripheralUuid, serviceNo, CharacteristicNo, listener, notify) {
	var self = this;
	return new Promise(function(resolve, reject) {
		if(serviceNo.length > 3) {
			serviceNo = self.getService(peripheralUuid, serviceNo);
			if(serviceNo == -1) {
				reject('Serivce not available! Got - ' + serviceNo);
				return;
			}
		}
		// console.log(self._peripheral[peripheralUuid].services[serviceNo].characteristics);
		if(CharacteristicNo.length > 3) {
			CharacteristicNo = self.getCharacteristics(peripheralUuid, serviceNo, CharacteristicNo);
			if(CharacteristicNo == -1) {
				reject('Characteristic not available! Got - ' + CharacteristicNo);
				return;
			}
		}
	  	var characteristic = self._peripheral[peripheralUuid].services[serviceNo].characteristics[CharacteristicNo];

	  	characteristic.notify(notify, function(error) {
		    if (notify) {
		      	characteristic.addListener('data', listener);
		    } else {
		      	characteristic.removeListener('data', listener);
		    }
		    resolve();
	  	});
	});
};

BLE.prototype.subscribeCharacteristic = function(peripheralUuid, serviceNo, CharacteristicNo, listener) {
	return this.notifyCharacteristics(peripheralUuid, serviceNo, CharacteristicNo, listener, true);
};

BLE.prototype.unsubscribeCharacteristic = function(peripheralUuid, serviceNo, characteristicUuid, listener) {
	return this.notifyCharacteristics(peripheralUuid, serviceNo, CharacteristicNo, listener, false);
};

BLE.prototype.getDeviceInformation = function (peripheralUuid) {
	var self = this;
	var service = null
	return new Promise(function (resolve, reject) {
		for (var id in self._peripheral[peripheralUuid].services) {
			if (self._peripheral[peripheralUuid].services[id].uuid == '1800') {
				service = self._peripheral[peripheralUuid].services[id]
			}
			service.characteristics[0].read(function (error, data) {
				if (error) {
					return reject('Not able to read')
				}
				return resolve(data);
			})
		}
	})
}

BLE.prototype.discoverAllServicesAndCharacteristics = function (peripheralUuid) {
	// var self = this;
	// this._testperipherals[peripheralUuid].discoverServices(null, function (error, services) {
	// 	if(error){
	// 		console.log(error);
	// 		throw new Error('failed ', error);
	// 	}
	// 	for(var i in services) {
	var self = this;
	//console.log("trying to discover services for " + peripheralUuid);
	return new Promise(function (resolve, reject) {
		self._peripheral[peripheralUuid].discoverAllServicesAndCharacteristics(function (error, services, allCharacteristics) {
			if (error) {
				return reject('Failed to get services and characteristics ' + error);
			}
			resolve();
		})
	})
	// 	}
	// })
}

BLE.prototype.listBeacons = function () {
	var beacons = {}
	Object.keys(this._peripherals).forEach(element => {
		var beaconManufacturedData = this._peripherals[element].advertisement.manufacturerData
		if (beaconManufacturedData == null) {
			return;
		}
		if ((beaconManufacturedData.length < 25) && (beaconManufacturedData.readUInt32BE(0) !== 0x4c000215)) {
			return;
		}
		//console.log(beaconManufacturedData);
		let uuid = [
			beaconManufacturedData.slice(4, 8).toString('hex'),
			beaconManufacturedData.slice(8, 10).toString('hex'),
			beaconManufacturedData.slice(10, 12).toString('hex'),
			beaconManufacturedData.slice(12, 14).toString('hex'),
			beaconManufacturedData.slice(14, 20).toString('hex')
		].join('-')
		//logger.info("UUID- "+uuid+ "Major Num-"+beaconManufacturedData.slice(20, 22).readUInt16BE(0) +"Minor Num-"+beaconManufacturedData.slice(22, 24)+"Tx Power "+beaconManufacturedData.slice(24, 25).readUInt8(0))

		beacons[element] = {
			uuid: uuid,
			major: beaconManufacturedData.slice(20, 22).readUInt16BE(0),
			minor: beaconManufacturedData.slice(22, 24).readUInt16BE(0),
			txPower: beaconManufacturedData.slice(24, 25).readUInt8(0)
		};

		// logger.info("UUID -"+element.uuid+"\tManufactured Data "+ element.Data)
	});
	return beacons;
}
BLE.prototype.createRSSIcontrollers = function(uuids, peripheral, polltimer, scantimer) {
    var self = this;
    return new Promise(function (resolve, reject) {
        uuids.forEach(uuid => {
            if (peripheral[uuid] == 'undefined') {
                return Promise.reject("Enter the UUID of nearby ble device");
            }
            rssi.create("BLEDevice-" + uuid, peripheral[uuid].rssi).then(devController => {
                controllers[uuid] = devController;
                resolve("BLEDevice-" + uuid+" created!")
            }, err => {
                logger.error(err);
                reject("Error +"+err);
			})

            self.updateRSSI(uuids, polltimer, scantimer)
        });
    });
}
BLE.prototype.updateRSSI = function(uuids, polltime, scantime) {
    var self = this;
	interval = setInterval(function () {
			self.startScan([], true, parseInt(scantime)).then(function() {
			setTimeout(function() {
                uuids.forEach(uuid => {
                    if (controllers[uuid] == undefined) return;
					if (self._peripherals[uuid] == undefined) {
                        controllers[uuid]._rssi = -150
						return;
					} else {
						var rssi = self._peripherals[uuid].rssi
						controllers[uuid]._rssi = rssi;
						dev$.publishResourceStateChange("BLEDevice-" + uuid, "rssi", rssi);
					}
				})
			},scantime)
		})
	}, polltime);
}

BLE.prototype.stopMonitorRSSI = function(uuids) {
    return new Promise(function (resolve, reject) {
        clearInterval(interval);
        uuids.forEach(uuid => {
            logger.warn("Trying to unregister controller with uuid-" + uuid)
            if (controllers[uuid] == undefined) {
                reject("Controller not found BLEDevice" + uuid)
            }
            controllers[uuid].stop()
            delete controllers[uuid]
            logger.warn("Controller unregistered successfully!");
            resolve("Controller unregistered successfully!");
        })
    });
}

BLE.prototype.getRssi = function (peripheralUuid) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self._peripheral[peripheralUuid].updateRssi(function(err, rssi) {
			if(err) {
				logger.error("Failed to get RSSI - " + err);
				return reject("Failed to get RSSI value " + err);
			}
			return resolve(rssi);
		});
	});
};


module.exports = BLE;