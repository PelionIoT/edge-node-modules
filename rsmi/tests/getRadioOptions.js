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
var jsonminify = require('jsonminify');
var fs = require('fs');

var module = process.argv[2] || 'ww-zwave';

var radioProfile = JSON.parse(jsonminify(fs.readFileSync(__dirname + '/../example.radioProfile.config.json', 'utf8')));

var hwversion = radioProfile.hardwareVersion;
var radioConfig = radioProfile.radioConfig;
var map = radioProfile.configurations[hwversion][radioConfig][module] || [];
var radioOptions = map[0] ? Object.assign({}, radioProfile.pcb_map[hwversion][map[0]], radioProfile.modules[module][map[1]]) : undefined;

console.log('Starting module on radio options from radioProfile.config.json- ', radioOptions);