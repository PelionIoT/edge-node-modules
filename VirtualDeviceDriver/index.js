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
var Logger = require('./utils/logger');
var configurator = require('devjs-configurator');
var ResourceManager = require('./src/resourceManager');

var logger = new Logger( {moduleName: 'Driver', color: 'bgGreen'} );

//---------------------------------------------------------------------
configurator.configure("VirtualDeviceDriver",__dirname).then(function(data) {
    var options = data;
    var initialDeviceStates = {};
    //Set loglevel
    global.VirtualLogLevel = options.logLevel || 2;

    logger.info('Starting with options ' + JSON.stringify(options));

    function startVirtualControllers() {
        var manager = new ResourceManager('VirtualDeviceDriver');
        manager.start(options).then(function() {
            logger.info('ResourceManager started successfully');
            manager.commands.register().then(function() {
                logger.info('Registered all the templates');
                manager.commands.init().then(function() {
                    logger.info('Started all device controllers');
                });
            }, function(err) {

            });
        }, function(err) {
            logger.error("Failed to start " + JSON.stringify(err));
        });
    }

    ddb.local.get('DevStateManager.DeviceStates').then(function(result) {
        if (result === null || result.siblings.length === 0) {
            //throw new Error('No such job');
            logger.debug('No initial device states found');
            initialDeviceStates = {};
        } else {
            initialDeviceStates = JSON.parse(result.siblings[0]) || {};
        }
        options.initialDeviceStates = initialDeviceStates;
        startVirtualControllers();
    });
}, function(err) {
    logger.error('Unable to load VirtualDeviceDriver config.json, ' + err);
    return;
});