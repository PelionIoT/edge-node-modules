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