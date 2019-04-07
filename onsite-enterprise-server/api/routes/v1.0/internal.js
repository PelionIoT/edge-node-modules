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

const express = require('express');
const router = express.Router();

//Middleware
const Middleware = require('./middlewares');

const requestLog = [];
// const config = require('./../../../res-config.json');

//Logger 
const Logger = require('./../../../utils/logger');
const logger = new Logger( {moduleName: 'Internal', color: 'white'} );

router.all('*', Middleware.authenticate, (req, res, next) => {
    // if(config.logRequests) {
    //     try {
    //         var log = {
    //             timestamp: new Date(),
    //             url: req.headers.host + req.url,
    //             method: req.method,
    //             params: req.params,
    //             body: req.body
    //         };
    //         console.log(log);
    //         // logger.debug('Got request, saving to request log- '+ JSON.stringify(log));
    //         // logger.info(log.method + ' ' + log.url + ' ' + JSON.stringify(log.params +  ' ' + log.body);
    //         requestLog.push(log);
    //     } catch(err) {
    //         logger.error('Failed to log request ' + JSON.stringify(err));
    //     }
    // }
    next();
});

router.get('/requestLog', (req, res) => {
    res.status(200).send(requestLog);
});

//Allow developers to increase log levels (0 to 4) for debugging
router.post('/logLevel', (req, res) => {
    logger.info('Got new log level ' + JSON.stringify(req.body));
    if(typeof req.body.level === 'number') {
        global.CuisLogLevel = req.body.level;
        res.status(200).send('Successful');
    } else {
        res.status(400).send('loglevel should be a key with value between 0 to 4');
    }
});

module.exports = router;