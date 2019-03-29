var DEFINES = require('./../../lib/defs').DEFINES;
var Logger = require('./../../utils/logger');
var logger = new Logger( { moduleName: 'DevicePairer', color: 'bgCyan'} );

// var successPairingEvents = {
//     start: 'Started searching for a zigbee device',
//     discovery: 'Found a device, extracting information',
//     info: 'Device information complete, processing data',
//     support: 'Discovered new zigbee device succesfully'
// }

// var failPairingEvents = {
//     start: 'Could not start the search, please try again',
//     discovery: 'Could not discover a new zigbee device, please make sure they are powered and unbound from other servers',
//     info: 'Extracting device information failed, please power cycle the device',
//     support: 'Device discovered but WigWag do not support this type, please contact support'
// }

var pairingStages = {
    1 : { progress: 10,  event: "Searching for a ZigBee device, started commissioning process" },
    2 : { progress: 25,  event: "Found a device, extracting information" },
    3 : { progress: 45,  event: "Device paired, initializing cluster classes" },
    4 : { progress: 65,  event: "Procuring manufacturer data and protocol info" },
    5 : { progress: 80,  event: "Initializing device controller" },
    6 : { progress: 100, event: "Commissioning complete, device paired successfully" },
    7 : { progress: 100, event: "Already bound" },
    8 : { progress: -1,  event: "Commissioning failed" },
    9 : { progress: -1,  event: "Do not support this type of device. Inclusion failed" },
    10 : { progress: -1,  event: "Commissioning incomplete, could not finish creating device controller" },
    11 : { progress: 85,  event: "WigWag do not support this type of device. Building generic controller (might not have all the functionality)" },
    12 : {progress: -1, event: "Could not start commissioning process, please try again!"}
}

var DevicePairer = dev$.resource('ZigbeeHA/DevicePairer', {
    start: function(options) {
        var self = this;
        logger.info('starting controller');
        this.znpController = options.znpController;
        this.defaultDuration = 60;

        this.znpController.removeAllListeners('pairingProgressEvent');
        this.znpController.on('pairingProgressEvent', function(stage) {
            if(typeof pairingStages[stage] !== 'undefined') {
                logger.info(JSON.stringify(pairingStages[stage]));
                self.emit('zigbeePairingProgress', pairingStages[stage]);
            }
        })
    },
    stop: function() {
        this.znpController.removeAllListeners('pairingProgressEvent');
    },
    state: {
        response: {
            get: function() {

            },
            set: function() {
            }
        }
    },
    commands: {
        addDevice: function(duration, metadata) {
            var self = this;
            if(typeof metadata == 'undefined') {
                duration = self.defaultDuration;
                logger.info('duration was undefined, using default: ' + duration);
            }
            if(typeof duration == 'number') {
                if(duration >= 255) {
                    logger.info('Using 255 will put the device in permanent pairing mode, thus using 254');
                    duration = 254; //255 means joining permission indefinite, Ref:  ZigBee-Pro Network Processor SWRA312
                } else if (duration < 0) {
                    logger.info('Use positive integer value, using default');
                    duration = self.defaultDuration; //default value
                }
                return this.znpController.addDevice(duration);
            }
            else
                return Promise.reject('parameter should be a number');
        },
        removeDevice: function() {
        },
        pairDevice: function(srcAddr) {
            return this.znpController.endDeviceAnnce({srcAddr: srcAddr, nwkAddr: srcAddr});
        }
    }
});

module.exports = DevicePairer;