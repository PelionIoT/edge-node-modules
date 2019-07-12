/**************************************************************************
#### WigWag Closed License

Copyright 2018. WigWag Inc. and its licensors. All Rights Reserved.

This file is part of deviceJS and subject to a deviceJS license agreement.

Unless otherwise agreed in a written license agreement with WigWag, you
may not use, copy, modify, distribute, display, perform, or create
derivative works of the contents

Under all circumstances, unless covered under a separate written agreement:
1)  WIGWAG MAKES NO WARRANTY OR REPRESENTATIONS ABOUT THE SUITABILITY OF THE
    CONTENTS FOR ANY PURPOSE; THE CONTENTS ARE PROVIDED "AS IS" WITHOUT ANY
    EXPRESS OR IMPLIED WARRANTY; AND
2)  WIGWAG SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, SPECIAL, OR
    CONSEQUENTIAL DAMAGES ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THE CONTENTS.
**************************************************************************/

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

var adapter = process.env.NOBLE_HCI_DEVICE_ID || 0;
function resetAdapter() {
    exec('hciconfig hci%s reset', adapter, function (error, stdout, stderr) { //command line utility for node to restart bluetooth-subprocess call
        if (error !== null) {
            logger.error("Failed to reset the adapter, error=" + JSON.stringify(error));
        } else {
            logger.info("Reset the bluetooth adapter, hci" + adapter);
        }
    });
}
resetAdapter();

configurator.configure("bluetoothlowenergy", __dirname).then(function (data) {
    options = data;
    global.BLELogLevel = options.logLevel || 5;
    logger.info('Options ' + JSON.stringify(options));
    ble = new BLE();
    var bleControllerID = "BluetoothDriver";
    var blueController = new bluetooth(bleControllerID);
    //    var beaconController = new bluetooth("BluetoothDriver");

    var warden = new Warden({
        ble: ble
    });
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