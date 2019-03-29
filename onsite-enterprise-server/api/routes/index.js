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
