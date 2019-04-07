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

var colors = require('colors');

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
    this._moduleName = 'unknown';
    if(typeof options.moduleName != 'undefined')
        this._moduleName = options.moduleName;

    this.color = colors.white;
    if(typeof options.color != 'undefined') {
        this.color = colors[options.color];
    }
}

Logger.prototype.error = function(str) {
    if(typeof global.DevStateLogLevel != 'undefined' && global.DevStateLogLevel >= 0) {
        if(typeof logger.error != 'undefined')
            logger.error(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
        else
            console.error(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
    }
}

Logger.prototype.warn = function(str) {
    if(typeof global.DevStateLogLevel != 'undefined' && global.DevStateLogLevel >= 1) {
        if(typeof logger.warn != 'undefined')
            logger.warn(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
        else
            console.warn(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
    }
}

Logger.prototype.info = function(str) {
    if(typeof global.DevStateLogLevel != 'undefined' && global.DevStateLogLevel >= 2) {
        if(typeof logger.info != 'undefined')
            logger.info(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
        else
            console.log(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
    }
}

Logger.prototype.debug = function(str) {
    if(typeof global.DevStateLogLevel != 'undefined' && global.DevStateLogLevel >= 3) {
        if(typeof logger.info != 'undefined')
            logger.info(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
        else
            console.log(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
    }
}

Logger.prototype.trace = function(str) {
    if(typeof global.DevStateLogLevel != 'undefined' && global.DevStateLogLevel >= 4) {
        if(typeof logger.info != 'undefined')
            logger.info(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
        else
            console.log(this.color('DevStateManager' + ' ' + this._moduleName + ': ' +  str));
    }
}

module.exports = Logger;