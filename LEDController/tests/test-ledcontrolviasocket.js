'use strict';
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

const led = require('./../led');

const options = {
    "ledBrightness": 10,
    "ledColorProfile": "RGB",
    "ledDriverSocketPath": "/var/deviceOSkeepalive",
};

led.init(options.ledColorProfile, options.ledDriverSocketPath).then(function() {
    console.log('LEDController: Waiting for bootup');
}, function(err) {
    console.error('Init failed ', err);
}).then(function() {
    console.error('LEDController: Started LED controller successfully');
    // led.setcolor(10, 0, 0);
//    led.alertOn(0, 10, 0);

    setInterval(function() {
        led.heartbeat(0,0,5, 2);
    }, 1000);
});
