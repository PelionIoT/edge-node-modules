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
    @file utils/logger.js
    @brief Logging module
    @author Yash <yash@wigwag.com>
    @date 10/24/2018
**/

'use strict';

const colors = require('colors');
const jsonminify = require('jsonminify');
const fs = require('fs');

function getDateTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

var logger = console;
if(typeof dev$ !== 'undefined')
	logger = log;

var Logger = function(options) {
	this._tag = 'unknown';
	if(typeof options.tag != 'undefined')
		this._tag = options.tag;

	this.color = colors.white;
	if(typeof options.color != 'undefined') {
		this.color = colors[options.color];
	}

    if(typeof global.BLELogLevel === 'undefined') {
        global.BLELogLevel = 2;
    }

    this._printDate = true;
};

Logger.prototype.error = function(str) {
	if(typeof global.BLELogLevel != 'undefined' && global.BLELogLevel >= 0) {
		if(typeof logger.error != 'undefined')
			logger.trace(colors.red((this._printDate ? (getDateTime() + " ") : "") + 'ERROR BLE' + ' ' + this._tag + ': ' +  str));
		else
			console.trace(colors.red((this._printDate ? (getDateTime() + " ") : "") + (this._printDate ? (getDateTime() + " ") : "") + 'ERROR BLE' + ' ' + this._tag + ': ' +  str));
	}
};

Logger.prototype.warn = function(str) {
	if(typeof global.BLELogLevel != 'undefined' && global.BLELogLevel >= 1) {
		if(typeof logger.warn != 'undefined')
			logger.warn(colors.yellow((this._printDate ? (getDateTime() + " ") : "") + 'WARN BLE' + ' ' + this._tag + ': ' +  str));
		else
			console.warn(colors.yellow((this._printDate ? (getDateTime() + " ") : "") + 'WARN BLE' + ' ' + this._tag + ': ' +  str));
	}
};

Logger.prototype.info = function(str) {
	if(typeof global.BLELogLevel != 'undefined' && global.BLELogLevel >= 2) {
		if(typeof logger.info != 'undefined')
			logger.info(this.color((this._printDate ? (getDateTime() + " ") : "") + 'INFO BLE' + ' ' + this._tag + ': ' +  str));
		else
			console.log(this.color((this._printDate ? (getDateTime() + " ") : "") + 'INFO BLE' + ' ' + this._tag + ': ' +  str));
	}
};

Logger.prototype.debug = function(str) {
	if(typeof global.BLELogLevel != 'undefined' && global.BLELogLevel >= 3) {
		if(typeof logger.info != 'undefined')
			logger.info(this.color((this._printDate ? (getDateTime() + " ") : "") + 'DEBUG BLE' + ' ' + this._tag + ': ' +  str));
		else
			console.log(this.color((this._printDate ? (getDateTime() + " ") : "") + 'DEBUG BLE' + ' ' + this._tag + ': ' +  str));
	}
};

Logger.prototype.trace = function(str) {
	if(typeof global.BLELogLevel != 'undefined' && global.BLELogLevel >= 4) {
		if(typeof logger.info != 'undefined')
			logger.info(this.color((this._printDate ? (getDateTime() + " ") : "") + 'TRACE BLE' + ' ' + this._tag + ': ' +  str));
		else
			console.log(this.color((this._printDate ? (getDateTime() + " ") : "") + 'TRACE BLE' + ' ' + this._tag + ': ' +  str));
	}
};

module.exports = Logger;