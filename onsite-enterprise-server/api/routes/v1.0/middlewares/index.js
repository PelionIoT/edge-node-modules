'use strict';
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
