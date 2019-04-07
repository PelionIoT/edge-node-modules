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

//Used when run under localhost
// router.use('/cloud-ui-server/docs', require('./docs'));
router.use('/wigwag/cloud-ui-server/v2/accounts/:accountID', (req, res, next) => {
    req.headers.accountID = req.params.accountID;
    next();
}, require('./v1.0'));
router.use('/wigwag/cloud-ui-server/v2', require('./v1.0'));
router.use('/wigwag/cloud-ui-server/accounts/:accountID', (req, res, next) => {
    req.headers.accountID = req.params.accountID;
    next();
}, require('./v1.0'));
router.use('/wigwag/cloud-ui-server', require('./v1.0'));


router.use('/cloud-ui-server/v2/accounts/:accountID', (req, res, next) => {
    req.headers.accountID = req.params.accountID;
    next();
}, require('./v1.0'));
router.use('/cloud-ui-server/v2', require('./v1.0'));
router.use('/cloud-ui-server/accounts/:accountID', (req, res, next) => {
    req.headers.accountID = req.params.accountID;
    next();
}, require('./v1.0'));
router.use('/cloud-ui-server', require('./v1.0'));


router.use('/wigwag/api/accounts/:accountID', (req, res, next) => {
    req.headers.accountID = req.params.accountID;
    next();
}, require('./v1.0'));
router.use('/wigwag/api', require('./v1.0'));

router.use('/api/accounts/:accountID', (req, res, next) => {
    req.headers.accountID = req.params.accountID;
    next();
}, require('./v1.0'));
router.use('/api', require('./v1.0'));
//***Production

//Docs
// router.use('/docs', require('./docs'));

router.use('/accounts/:accountID', (req, res, next) => {
    req.headers.accountID = req.params.accountID;
    next();
}, require('./v1.0'));

router.use('/', require('./v1.0'));
router.use('/v1.0', require('./v1.0'));

module.exports = router;
