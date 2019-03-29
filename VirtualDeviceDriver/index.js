var Logger = require('./utils/logger');
var configurator = require('devjs-configurator');
var ResourceManager = require('./src/resourceManager');

var logger = new Logger( {moduleName: 'Driver', color: 'bgGreen'} );

//---------------------------------------------------------------------
configurator.configure("VirtualDeviceDriver",__dirname).then(function(data) {
    var options = data;
    var initialDeviceStates = {};
    //Set loglevel
    global.VirtualLogLevel = options.logLevel || 2;

    logger.info('Starting with options ' + JSON.stringify(options));

    function startVirtualControllers() {
        var manager = new ResourceManager('VirtualDeviceDriver');
        manager.start(options).then(function() {
            logger.info('ResourceManager started successfully');
            manager.commands.register().then(function() {
                logger.info('Registered all the templates');
                manager.commands.init().then(function() {
                    logger.info('Started all device controllers');
                });
            }, function(err) {

            });
        }, function(err) {
            logger.error("Failed to start " + JSON.stringify(err));
        });
    }

    ddb.local.get('DevStateManager.DeviceStates').then(function(result) {
        if (result === null || result.siblings.length === 0) {
            //throw new Error('No such job');
            logger.debug('No initial device states found');
            initialDeviceStates = {};
        } else {
            initialDeviceStates = JSON.parse(result.siblings[0]) || {};
        }
        options.initialDeviceStates = initialDeviceStates;
        startVirtualControllers();
    });
}, function(err) {
    logger.error('Unable to load VirtualDeviceDriver config.json, ' + err);
    return;
});