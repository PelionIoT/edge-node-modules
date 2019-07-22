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
    @file index.js
    @brief Main
    @author Yash <yash@wigwag.com>
    @date 10/24/2018
**/

'use strict';

const Logger = require('./utils/logger');
const configurator = require('devjs-configurator');
const bluetooth = require('./src/bluetooth');
const BLE = require('./src/init-noble');
const Warden = require('./src/warden');
var program = require('commander');

var ble = null;
const logger = new Logger({
    tag: 'Main',
    color: 'green'
});

var exec = require('child_process').exec;
var options;

var port = [];


if (process.argv[3] !== undefined) {
    port = process.argv[3].split('=');
} else {
    port[1] = '0';
}

process.on('SIGINT', function (error) {
    logger.warn('Got SIGINT, Good bye!');
    process.exit(1);
});


process.on('unhandledRejection', r => logger.error('Unhandled Rejection ' + JSON.stringify(r) + ' ' + r));
process.on('unhandledException', r => logger.error('Unhandled Exception ' + JSON.stringify(r) + ' ' + r));


configurator.configure("bluetoothlowenergy", __dirname).then(function (data) {
    options = data;
    global.BLELogLevel = options.logLevel || 5;
    logger.info('Options ' + JSON.stringify(options));
    if(options.hciDeviceID) {
        process.env.NOBLE_HCI_DEVICE_ID = options.hciDeviceID;
    }
    var adapter = process.env.NOBLE_HCI_DEVICE_ID || 0;
    logger.info("Using hci deviceID - " + adapter);
    function resetAdapter() {
        exec('hciconfig hci%s up', adapter, function (error, stdout, stderr) { //command line utility for node to restart bluetooth-subprocess call
            if (error !== null) {
                logger.error("Failed to reset the adapter, error=" + JSON.stringify(error));
            } else {
                logger.info("Reset the bluetooth adapter, hci" + adapter);
            }
        });
    }
    resetAdapter();

    ble = new BLE();
    var bleControllerID = "BluetoothDriver";
    var blueController = new bluetooth(bleControllerID);
    //    var beaconController = new bluetooth("BluetoothDriver");

    var warden = new Warden({
        ble: ble
    });
    warden.start().then(function() {
        logger.info('Warden started successfully!');
        blueController.start({
            deviceID: bleControllerID,
            ble: ble,
            warden: warden
        }).then(function () {
            logger.info('Bluetooth controller started successfully!');
        }, function (err) {
            logger.error('Failed to start bluetooth controller ' + err);
        });
        var interval = setInterval(function () {
            if (ble.state() == 'poweredOn') {
                clearInterval(interval);
                ble.startScan([], false, 10000).then(function () {

                }, function (err) {
                    logger.error("Scan failed " + err);
                });
            } else {
                logger.warn('BLE is not ready! Got state- ' + ble.state());
                resetAdapter();
            }
        }, 5000);
    }, function(err) {
        logger.error("Failed to start warden!");
        setTimeout(function() {
            logger.error("Shutting down! Restart and try again!");
            process.exit(1);
        }, 5000);
    });
    //    devicePairer = new DevicePairer('Bluetooth/DevicePairer');
    //    startPairer();
});
/*
function startPairer() {
    devicePairer.start({bleModule: ble}).then(function() {
        logger.info('Device Pairer started successfully');
    }, function(err) {
        if(typeof err.status !== 'undefined' && err.status == 500 && err.response == 'Already registered') {

        } else {
            logger.error('Device Pairer failed with error- ' + JSON.stringify(err) + ' will try again in 5 seconds!');
        }
    });
}*/