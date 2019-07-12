var Logger = require('./../../utils/logger');

var logger = new Logger( {moduleName: 'DevicePairer', color: 'bgCyan'} );

var DevicePairer = dev$.resource('Bluetooth/DevicePairer', {
    start: function(options) {
        
        var self = this;
        this._bleModule = options.bleModule;
        
        this._bleModule.on('addDevice', function(stage) {
            // if(typeof pairingStages[stage] !== 'undefined') {
            //     logger.info(JSON.stringify(pairingStages[stage]));
            //     self.emit('pairingProgress', pairingStages[stage]);
            //}
            console.log("got addDevice command event")
        });

        this._bleModule.on('removeDevice', function(stage) {
            // if(typeof unpairingStages[stage] !== 'undefined') {
            //     logger.info(JSON.stringify(unpairingStages[stage]));
            //     self.emit('unpairingProgress', unpairingStages[stage]);
            // }
           console.log("got removeDevice command event")
        });
    },
    stop: function() {
    },
    state: {
    },
    commands: {
        addDevice: function(uuid) {
            return this._bleModule.connectDevice(uuid);
        },
        removeDevice: function(uuid) {
            return this._bleModule.removeDevice(uuid);
        }
    }
});

module.exports = DevicePairer;