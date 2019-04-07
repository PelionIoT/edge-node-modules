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
var HumiditySensor = require('./../controllers/HumiditySensor/controller');
var LightBulb = require('./../controllers/LightBulb/controller');
var MotionSensor = require('./../controllers/MotionSensor/controller');
var ContactSensor = require('./../controllers/ContactSensor/controller');

var Logger = require('./utils/logger');
var logger = new Logger( {moduleName: 'Manager', color: 'cyan'} );

var hs = new HumiditySensor('HumiditySensor1');
hs.start({id: 'HumiditySensor1'}).then(function() {
    logger.info('HumiditySensor started succesfully');
});

var lb = new LightBulb('LightBulb1');
lb.start({id: 'LightBulb1'}).then(function() {
    logger.info('LightBulb started succesfully');
});

var ms = new MotionSensor('MotionSensor1');
ms.start({id: 'MotionSensor1'}).then(function() {
    logger.info('MotionSensor started succesfully');
});

var cs = new ContactSensor('VirtualContactSensor1');
cs.start({id: 'VirtualContactSensor1'}).then(function() {
    logger.info('ContactSensor started succesfully');
});