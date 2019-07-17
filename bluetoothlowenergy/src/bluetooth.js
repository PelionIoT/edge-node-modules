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

var Logger = require('./../utils/logger');

var logger = new Logger({
    tag: 'Bluetooth',
    color: 'bgGreen'
});

function tempNotify(data) {
    var integer = data.readInt8(0);
    var decimal = data.readUInt8(1);
    var temperature = integer + (decimal/100);
    console.log(temperature);
}

function buttonNotify(data) {
    console.log(data);
}

var Bluetooth = {
    start: function (obj) {
        var self = this;
        this._ble = obj.ble;
        this._warden = obj.warden;
        this._deviceID = obj.deviceID;

        this._ble.on('ble-discovered-devices', function(data) {
            try {
                var newdevices = {};
                data = JSON.parse(data);
                Object.keys(data).forEach(function(uuid) {
                    newdevices[uuid] = JSON.parse(JSON.stringify(data[uuid]));
                    delete newdevices[uuid].services;
                    delete newdevices[uuid].advertisement;
                });
                if(Object.keys(newdevices).length > 0) {
                    dev$.publishResourceStateChange(self._deviceID, "peripherals", JSON.stringify(newdevices)).then(function() {

                    }, function(err) {
                        logger.error("Failed to send discover devices " + JSON.stringify(err));
                    });
                }
            } catch(err) {
                logger.error("Catch: failed to send discover devices " + JSON.stringify(err));
            }
        });
    },
    stop: function () {},
    state: {
        startScan: {
            get: function () {
                return Promise.reject('Writeonly facade!');
            },
            set: function () {
                return this.commands.startScan(10000, false);
            }
        },
        stopScan: {
            get: function () {
                return Promise.reject('Writeonly facade!');
            },
            set: function () {
                return this._ble.stopScan();
            }
        },
        peripherals: {
            get: function () {
                return this._ble.getPeripherals();
            },
            set: function () {
                return Promise.reject('Readonly facade!');
            }
        },
        peripheral: {
            get: function () {
                return Promise.reject('writeonly facade!');
            },
            set: function (uuid) {
                return this._ble.getPeripheral(uuid);
            }
        },

        myAddress: {
            get: function () {
                return this._ble.myAddress();
            },
            set: function () {
                return Promise.reject('Readonly facade!');
            }
        },
        connect: {
            get: function () {
                return Promise.reject('Writeonly facade!');
            },
            set: function (uuid) {
                return this._ble.connect(uuid);
            }
        },
        addDevice: {
            get: function () {
                return Promise.reject('Writeonly facade!');
            },
            set: function (uuid) {
                return this._warden.createController(uuid);
            }
        },
        removeDevice: {
            get: function () {
                return Promise.reject('Writeonly facade!');
            },
            set: function (uuid) {
                return this._warden.stopController(uuid);
            }
        },
        discoverServices: {
            get: function () {
                return Promise.reject('Writeonly facade!');
            },
            set: function (uuid) {
                return this._ble.discoverServices(uuid);
            }
        },

        discoverCharacteristic: {
            get: function () {
                return Promise.reject('Writeonly facade!');
            },
            set: function (uuid) {
                return this._ble.discoverCharacteristics(uuid);
            }
        },

        rssi: {
            get: function () {
                return Promise.reject('Writeonly facade!');
            },
            set: function (uuid) {
                return this._ble.getRssi(uuid);
            }
        }
    },
    commands: {
        startScan: function (timer, duplicates) {
            timer = timer | 10000;
            duplicates = duplicates | false;
            return this._ble.startScan([], duplicates, timer);
        },
        stopScan: function () {
            return this._ble.stopScan();
        },
        getPeripherals: function () { //peripherals of all the nearby devices
            return this._ble.getPeripherals();
        },
        getPeripheralByUUID: function (uuid) {
            return this._ble.getPeripheral(uuid)
        },
        getServices: function (uuid) {
            return this._ble.discoverServices(uuid)
        },
        getCharacteristics: function (peripheralUuid, serviceNo) {
            return this._ble.discoverCharacteristics(peripheralUuid);
        },
        connect: function (uuid) {
            this._ble.stopScan();
            return this._ble.connect(uuid);
        },
        disconnect: function (uuid) {
            return this._ble.disconnect(uuid);
        },
        write: function (uuid, serviceNo, CharacteristicNo, message) {
            return this._ble.writeCharacteristic(uuid, serviceNo, CharacteristicNo, message);
        },
        read: function (uuid, serviceNo, CharacteristicNo) {
            return this._ble.readCharacteristic(uuid, serviceNo, CharacteristicNo);
        },
        getInfo: function (uuid) {
            return this._ble.getDeviceInformation(uuid);
        },

        listBeacons: function () {
            return this._ble.listBeacons();
        },
        MonitorRSSI: function (uuid, timer) {
            this._warden.createSignalStrengthController(uuid, this._ble.getPeripherals(), timer);
        },
        stopMonitorRSSI: function (uuids) {
            this._warden.stopRSSI(uuids);
        },
        led_off: function(uuid) {
            var buffer = new Buffer(4);
            buffer.writeUInt8(1, 0);
            buffer.writeUInt8(0, 1);
            buffer.writeUInt8(10, 2);
            buffer.writeUInt8(10, 3);
            return this._ble.writeCharacteristic(uuid, 'ef6803009b3549339b1052ffa9740042', 'ef6803019b3549339b1052ffa9740042', false, buffer);
        },
        temperature: function(uuid) {
            return this._ble.subscribeCharacteristic(uuid, 'ef6802009b3549339b1052ffa9740042', 'ef6802019b3549339b1052ffa9740042', tempNotify);
        },
        button: function(uuid) {
            return this._ble.subscribeCharacteristic(uuid, 'ef6803009b3549339b1052ffa9740042', 'ef6803029b3549339b1052ffa9740042', buttonNotify);
        },
        startMonitorRSSI: function (uuid, polltime, scantime) {
            return this._ble.createRSSIcontrollers(uuid, this._ble.getPeripherals(), polltime, scantime);
        }
    }
};

module.exports = dev$.resource('bluetooth-low-energy', Bluetooth);