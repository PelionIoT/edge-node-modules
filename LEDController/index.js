var LEDController = require('./controller');
var configurator = require('devjs-configurator');
var LEDDriver = require('./deviceController/driver');

var ledController;
var driver;

configurator.configure("LEDController", __dirname).then(function(options) {
	log.info('LEDController: configurator read- ', JSON.stringify(options));
    if(typeof options.ledColorProfile === 'undefined') {
        options.ledColorProfile = 'RGB';
    }

    if(typeof options.ledBrightness === 'undefined') {
        options.ledBrightness = 5;
    }

    ledController = new LEDController(options);
    ledController.start();

    function startLedDriver() {
        driver = new LEDDriver('LEDDriver');
        driver.start({ledController: ledController, config: options}).then(function() {
            log.info('LEDController: LED Driver started successfully');
        }, function(err) {
            log.error('LEDController: failed to start led driver ' + JSON.stringify(err));
            setTimeout(function() {
                startLedDriver();
            }, 5000);
        }); 
    }

    startLedDriver();
}, function(err) {
    log.error('Unable to load LEDController config.json, ', err);
});