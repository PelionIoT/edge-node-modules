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
var LEDController = require('./controller');
var configurator = require('devjs-configurator');
var LEDDriver = require('./deviceController/driver');

var ledController;
var driver;

configurator.configure("LEDController", __dirname).then(function(options) {
	log.info('LEDController: configurator read- ', JSON.stringify(options));
    if(typeof options.ledColorProfile === 'undefined') {
        options.ledColorProfile = 'RGB';
    }

    if(typeof options.ledBrightness === 'undefined') {
        options.ledBrightness = 5;
    }

    ledController = new LEDController(options);
    ledController.start();

    function startLedDriver() {
        driver = new LEDDriver('LEDDriver');
        driver.start({ledController: ledController, config: options}).then(function() {
            log.info('LEDController: LED Driver started successfully');
        }, function(err) {
            log.error('LEDController: failed to start led driver ' + JSON.stringify(err));
            setTimeout(function() {
                startLedDriver();
            }, 5000);
        }); 
    }

    startLedDriver();
}, function(err) {
    log.error('Unable to load LEDController config.json, ', err);
});