/*
 * Copyright (c) 2018, Arm Limited and affiliates.
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

var Dev = require("./rssiController");
const Logger = require('./../../utils/logger');
const logger = new Logger({
    tag: 'RSSI',
    color: 'blue'
});

var RssiController = function () {
    var self = this;
}

RssiController.prototype.addResourceType = function (config) {
    return new Promise(function (resolve, reject) {
        dev$.addResourceType(config).then(function () {
            resolve(config.name);
        }, function (err) {
            logger.error("Error: " + err)
            reject(err);
        });
    });
}

RssiController.prototype.start = function (id, initStates, resourceConfig) {
    var self = this;
    return new Promise(function (resolve, reject) {
        dev$.listInterfaceTypes().then(function (interfaceTypes) {
            var devInterfaceStates = [];
            resourceConfig.interfaces.forEach(function (intf) {
                if (typeof interfaceTypes[intf] !== 'undefined' && intf.indexOf("Facades") > -1) {
                    try {
                        devInterfaceStates.push(Object.keys(interfaceTypes[intf]['0.0.1'].state)[0]);
                    } catch (e) {
                        reject('Failed to parse interface ' + e);
                    }
                } else {
                    console.log('\x1b[33m THIS SHOULD NOT HAVE HAPPENED. FOUND INTERFACE WHICH IS NOT SUPPORTED BY DEVICEJS');
                }
            });
            var Device = dev$.resource(resourceConfig.name, Dev);
            var device = new Device(id);

            device.start({
                id: id,
                supportedStates: devInterfaceStates,
                initStates: initStates || {}
            }).then(function () {
                ddb.shared.put('WigWagUI:appData.resource.' + id + '.name', id);
                resolve(device);
            }, function (err) {
                reject(err);
            });
        });
    });
}



var resourceconfig = {
    "name": "Core/Devices/Bluetooth/BLE/BLEDevices",
    "version": "0.0.1",
    "interfaces": ["Facades/SignalStrength"]
}

RssiController.prototype.create = function (id, rssi) {
    var self = this
    return new Promise(function (resolve, reject) {
        self.addResourceType(resourceconfig).then(function (res) {
            logger.info('Successfully added resource ' + res);
            self.start(id, {
                rssi: rssi
            }, resourceconfig).then(function (devController) {
                logger.info("Started controller " + id)
                resolve(devController)
            }, function (err) {
                logger.error('Failed to start device controller ' + JSON.stringify(err));
                reject(err)
            });
        }, function (err) {
            logger.error('Failed to add resource type ' + JSON.stringify(err));
            reject(err)
        });
    })
}

module.exports = RssiController