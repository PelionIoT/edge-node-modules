var HumiditySensor = require('./../controllers/HumiditySensor/controller');
var LightBulb = require('./../controllers/LightBulb/controller');
var MotionSensor = require('./../controllers/MotionSensor/controller');
var ContactSensor = require('./../controllers/ContactSensor/controller');

var Logger = require('./utils/logger');
var logger = new Logger( {moduleName: 'Manager', color: 'cyan'} );

var hs = new HumiditySensor('HumiditySensor1');
hs.start({id: 'HumiditySensor1'}).then(function() {
    logger.info('HumiditySensor started succesfully');
});

var lb = new LightBulb('LightBulb1');
lb.start({id: 'LightBulb1'}).then(function() {
    logger.info('LightBulb started succesfully');
});

var ms = new MotionSensor('MotionSensor1');
ms.start({id: 'MotionSensor1'}).then(function() {
    logger.info('MotionSensor started succesfully');
});

var cs = new ContactSensor('VirtualContactSensor1');
cs.start({id: 'VirtualContactSensor1'}).then(function() {
    logger.info('ContactSensor started succesfully');
});