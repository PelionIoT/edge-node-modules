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

const jwt = require('jsonwebtoken');

let authenticate = (req, res, next) => {
    //TODO- Need to work on Authentication with Jordan
    // next();
    if(req.url.indexOf('/oauth') > -1) {
         next();
         return;
    }
    if(req.url.indexOf('/auth') > -1) {
         next();
         return;
    }
    //if the route is /web then ignore authentication
    if(req.url.indexOf('/web') > -1) {
         next();
         return;
    }
    //When localhost dont check authentication
    if(req.headers['x-wigwag-identity']) {
        if(req.headers['x-wigwag-authenticated']) {
            let auth = jwt.decode(req.headers.authorization.substring(7));
            req.params.accountID = auth.accounts[0];
            next();
        } else {
            res.status(401).send();
        }
    } else if(req.headers.authorization) { //This is temporary to keep developing on localhost
        //Validate if the authorization header is correct
        let auth = jwt.decode(req.headers.authorization.substring(7));
        if(auth && auth.userID && auth.accounts && auth.associationID && auth.iat) {
            req.params.accountID = auth.accounts[0];
            next();
        } else {
            res.status(401).send();
        }
    } else {
        res.status(401).send();
    }
};

module.exports = {
    authenticate
};
