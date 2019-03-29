'use strict';

const led = require('./../led');

const options = {
    "ledBrightness": 10,
    "ledColorProfile": "RGB",
    "ledDriverSocketPath": "/var/deviceOSkeepalive",
};

led.init(options.ledColorProfile, options.ledDriverSocketPath).then(function() {
    console.log('LEDController: Waiting for bootup');
}, function(err) {
    console.error('Init failed ', err);
}).then(function() {
    console.error('LEDController: Started LED controller successfully');
    // led.setcolor(10, 0, 0);
//    led.alertOn(0, 10, 0);

    setInterval(function() {
        led.heartbeat(0,0,5, 2);
    }, 1000);
});
