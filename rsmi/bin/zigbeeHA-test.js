var ZNPController = require('/wigwag/devicejs-core-modules/node_modules/node-znp/tests/znpController').ZNPController;
var Probe802154 = require(__dirname + '/../index.js').Probe802154;
var jsonminify = require('jsonminify');
var fs = require('fs');

var options = {
	siodev: '/dev/ttyS6',
	devType: 0x00,
	newNwk: false,
	channelMask: 0x800,
	baudRate: 115200
};

var radioProfile = JSON.parse(jsonminify(fs.readFileSync( __dirname + '/../radioProfile.config.json', 'utf8')));

var hwversion = radioProfile.hardwareVersion;
var radioConfig = radioProfile.radioConfig;
var map = radioProfile.configurations[hwversion][radioConfig]["zigbeeHA"] || [];
var radioOptions = map[0] ? Object.assign({}, radioProfile.pcb_map[hwversion][map[0]], 
    radioProfile.modules["zigbeeHA"][map[1]], {"module": "zigbee"}) : undefined;

console.log('Starting module on radio options from radioProfile.config.json- ' + JSON.stringify(radioOptions));
if(typeof radioOptions == 'undefined') {
    //use default
    // radioOptions = defaultRadioOptions;
    clearTimeout(runningStatusTimer);
    console.error('Radio options are not defined in the radioProfile.config.json. Most likely ZigBee module is not installed on this hardware.');
    process.exit(0);
} else {
    //Probe the module based on UART
    options.siodev = radioOptions.siodev;
    options.baudrate = radioOptions.baudrate;

    var znpHandler = new ZNPController(options);
    var probeZigbeeHA = new Probe802154(radioOptions);

    probeZigbeeHA.setup802154GPIOs().then(function() {
        console.log("Starting ZNP TEST Controller...");

        var timeout = setTimeout(function() {
            console.error('ZNPController start timedout, failed');
            process.exit(1);
        }, 30000); 

        znpHandler.start().then(function() {
            clearTimeout(timeout);
            console.log('ZNPController started succesfully');
            // znpHandler.addDevice(60).then(function() {
            //  console.log('Adding command succesful');
            // });
            process.exit(0);
        }, function() {
            console.error('ZNPController start failed');
            process.exit(1);
        });

        console.log("Trying to connect to znp module...");
        znpHandler.connect().then(function() {
            console.log("Connection with znp module established succesfully");
            // process.exit(0);
        }, function() {
            console.log("Connection could not be established");
            process.exit(1);
        });
    });
}
