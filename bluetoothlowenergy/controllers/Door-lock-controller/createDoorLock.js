var Dev = require("./doorlock");
const Logger = require('./../../utils/logger');
const logger = new Logger( {tag: 'BLE', color: 'blue'} );



function addResourceType(config) {
    return new Promise(function(resolve, reject) {
        dev$.addResourceType(config).then(function() {
            resolve(config.name);
        }, function(err) {console.log("Error: ")
            reject(err);
        });
    });
}

function start(id, initStates, resourceConfig,ble) {
    var self = this;
    return new Promise(function(resolve, reject) {
        dev$.listInterfaceTypes().then(function(interfaceTypes) {
            var devInterfaceStates = [];
            resourceConfig.interfaces.forEach(function(intf) {
                if(typeof interfaceTypes[intf] !== 'undefined' && intf.indexOf("Facades") > -1) {
                    try {
                        devInterfaceStates.push(Object.keys(interfaceTypes[intf]['0.0.1'].state)[0]);
                    } catch(e) {
                        reject('Failed to parse interface ' + e);
                    }
                } else {
                    console.log('\x1b[33m THIS SHOULD NOT HAVE HAPPENED. FOUND INTERFACE WHICH IS NOT SUPPORTED BY DEVICEJS');
                }
            });
            var Device = dev$.resource(resourceConfig.name, Dev);
            var device = new Device(id);

            device.start({
                id: id,
                supportedStates: devInterfaceStates,
                initStates: initStates || {},
                ble: ble
            }).then(function() {
                ddb.shared.put('WigWagUI:appData.resource.' + id + '.name', id);
                resolve(device);
            }, function(err) {
                reject(err);
            });
        });
    });
}



var resourceconfig = {
    "name": "Core/Devices/Bluetooth/BLE/DoorLock",
    "version": "0.0.1",
    "interfaces": ["Facades/HasLock"]
}

var create = function(id,ble){
    return new Promise(function(resolve, reject) {
        addResourceType(resourceconfig).then(function(res) {
            logger.info('Successfully added resource '+res);
            start(id, {"lock": "lock"}, resourceconfig,ble).then(function(devController) {
                logger.warn("Started controller "+id)
                resolve(devController)
            }, function(err) {
                logger.warn('Failed to start device controller ' + JSON.stringify(err));
                reject(err)
            });
        }, function(err) {
            logger.warn('Failed to add resource type ' + JSON.stringify(err));
            reject(err)
        });
    })
}

module.exports = {
create
}
