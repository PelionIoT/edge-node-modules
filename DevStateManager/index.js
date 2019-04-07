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
var us = require('underscore');

var Controller = require('./src/controller');

var logger = new Logger( {moduleName: 'Driver', color: 'bgGreen'} );

//---------------------------------------------------------------------
configurator.configure("DevStateManager",__dirname).then(function(data) {
    var options = data;
    var ddbOptions;
    var ddbRunOptions;

    //Set loglevel
    global.DevStateLogLevel = options.logLevel || 2;

    logger.info('Starting with options ' + JSON.stringify(options));

    function startDevStateControllers() {
        options.resourceID = 'DevStateManager';
        var controller = new Controller(options.resourceID);
        dev$.listInterfaceTypes().then(function(interfaces) {
            if(typeof ddbRunOptions === 'undefined') {
                ddb.local.put('DevStateManager.runtimeconfiguration', JSON.stringify(options));
                ddbRunOptions = options; 
            }
            if(typeof ddbOptions === 'undefined') {
                ddb.local.put('DevStateManager.configuration', JSON.stringify(options));
                ddbOptions = options;
            }
            if(!us.isEqual(options.pollingSchemes, ddbOptions.pollingSchemes)){
                ddb.local.put('DevStateManager.configuration', JSON.stringify(options));
                ddb.local.put('DevStateManager.runtimeconfiguration', JSON.stringify(options));
            } else if(!us.isEqual(ddbOptions.pollingSchemes, ddbRunOptions.pollingSchemes)){
                options.pollingSchemes = ddbRunOptions.pollingSchemes;
            }
            options.interfaces = interfaces;
            controller.start(options).then(function() {
                logger.info('Controller started successfully');
                controller.commands.populateDevStates().then(function() {
                    logger.info('Populated device states correctly');
                    controller.commands.startPeriodicSave();
                    controller.commands.seedDeviceState();
                    controller.commands.startPoll();
                });
            }, function(err) {
                //Failed to start, backoff and try again
                if(err.status !== 500) {
                    logger.error('Failed to start DevStateManager, trying again in 10 secs');
                    setTimeout(function() {
                        startDevStateControllers();
                    }, 10000);
                }
            });
        });
    }

    // startDevStateControllers();

    ddb.local.get('DevStateManager.configuration').then(function(result) {
        if(result === null || result.siblings.length === 0) {
            //throw new Error('No such job');
            logger.error('No config options found');
            return;
        }
        ddbOptions = JSON.parse(result.siblings[0]);
        logger.info('Got options from database ' + JSON.stringify(ddbOptions));
    }).then(function() {
        ddb.local.get('DevStateManager.runtimeconfiguration').then(function(result) {
            if(result === null || result.siblings.length === 0) {
                //throw new Error('No such job');
                logger.error('No runtime options found');
                return;
            }
            ddbRunOptions = JSON.parse(result.siblings[0]);
            logger.info('Got options from runtime database ' + JSON.stringify(ddbRunOptions));
        }).then(function() {
            startDevStateControllers();
        });
    });
}, function(err) {
    logger.error('Unable to load DevStateManager config.json, ' + err);
    return;
});
