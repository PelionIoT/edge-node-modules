var DEFINES = require('./../../lib/defs').DEFINES;
var Logger = require('./../../utils/logger');
var logger = new Logger( { moduleName: 'ZigbeeDriver', color: 'white'} );

/**
* ZigBee Home Automation Monitor (id='ZigbeeDriver')
*
* @class ZigbeeDriver
*/

var ZigbeeDriver = {
    start: function(options) {
        logger.info('starting controller');
        this.znpController = options;
    },
    stop: function() {
    },
    state: {
    },
    commands: {
        /**
        * Provide the state of the ZigBee HA controller
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getState')
        *
        * @method getState
        * @return {Boolean} true is the controller is up otherwise false
        */
        getState: function() {
            return this.znpController.getState();
        },

        /**
        * Get config options with which znp (TI stack) is started
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getConfigOptions')
        *
        * @method getConfigOptions
        * @return {Object} config options
        */
        getConfigOptions: function() {
            return this.znpController.getConfigOptions();
        },

        /**
        * Change the throttle rate on fly
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('newThrottleRate', 100)
        *
        * @method newThrottleRate
        * @param {Number} rate new throttle rate in ms
        */
        newThrottleRate: function(rate) {
            return this.znpController.newThrottleRate(rate);
        },

        /**
        * CAUTION! This could destory the existing zigbee network
        *
        * Delete the existing zigbee database
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('deleteZigbeeDatabase')
        *
        * @method deleteZigbeeDatabase
        */
        deleteZigbeeDatabase: function() {
            return this.znpController.deleteZigbeeDatabase();
        },
        /**
        * CAUTION! This could destory the existing zigbee network
        *
        * Delete the existing zigbee database and reboot the module
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('factoryReset')
        *
        * @method factoryReset
        */
        factoryReset: function() {
            return this.znpController.factoryReset();
        },

        /**
        * CAUTION! This could destory the existing zigbee network
        *
        * Restart module with specified network state, channel or panid. This will sigterm the process. Reboot will take in effect the new config.
        * On relay wait for Runner to restart the process, otherwise manually restart.
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('restartModule', true, 9, 25)
        *
        * @method restartModule
        * @param {Boolean} newNetwork true=new, false=restore
        * @param {Number} panId new network pan id
        * @param {Number} channel specify channel range 11-25
        * Zigbee HA Compliant Channels 11, 14, 15, 19, 20, 24, and 25 
        */
        restartModule: function(newNetwork, panId, channel) { //Boolean true- start new network, false- restore old network
            if(typeof newNetwork === 'object') {
                newNetwork = false;
            }
            return this.znpController.restartModule(!!newNetwork, panId, channel);
        },

        /**
        * CAUTION! This WILL destory the existing zigbee network
        *
        * Start new network
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('startNewNetwork')
        *
        * @method startNewNetwork
        */
        startNewNetwork: function() {
            return this.znpController.restartModule(true);
        },

        /**
        * Get the panid of the existing network
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getPanId')
        *
        * @method getPanId
        * @return {Number} panId returns panid of the existing network range 1-65533
        */
        getPanId: function(){
            return this.znpController.getNVItem(DEFINES.NV_ITEM_ID.PANID).then(function(data) {
                return data.readUInt16LE();
            })
        },

        /**
        * CAUTION! This WILL destory the existing zigbee network
        *
        * Specify new pan id of the network
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('setPanId', 40)
        *
        * @method setPanId
        * @param {Number} panId specify the new pan id of the new network, range=1-65533
        */
        setPanId: function(value) {
            return this.znpController.restartModule(true, value);
        },

        /**
        * Get channel of the existing network
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getChannel')
        *
        * @method getChannel
        * @return {Number} channel returns channel of the existing network
        */
        getChannel: function() {
            return this.znpController.getNVItem(DEFINES.NV_ITEM_ID.CHANLIST).then(function(data) {
                return Math.log2(data.readUInt32LE());
            })
        },

        /**
        * CAUTION! This WILL destory the existing zigbee network
        *
        * Specify new channel of the network
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('setChannel', 25)
        *
        * @method setChannel
        * @param {Number} channel specify new channel of the network, range=11-25
        */
        setChannel: function(channel) {
            if(channel < 11 || channel > 25) {
                return Promise.reject(new Error('Please specify channel between 11-25'));
            }
            return this.znpController.restartModule(true, undefined, channel);
        },

        /**
        * Get extended source address of the network
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getExtendedSrcAddress')
        *
        * @method getExtendedSrcAddress
        * @return {Object} returns 8 byte of extended source address
        */
        getExtendedSrcAddress: function() {
            return this.znpController.getNVItem(DEFINES.NV_ITEM_ID.EXTADDR).then(function(data) {
                return data;
            })
        },

        /**
        * Get extended PAN id of the network
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getExtendedPanId')
        *
        * @method getExtendedPanId
        * @return {Object} returns 8 byte of extended source address
        */
        getExtendedPanId: function() {
            return this.znpController.getNVItem(DEFINES.NV_ITEM_ID.EXTENDED_PAN_ID).then(function(data) {
                return data;
            })
        },
        /**
        * Get network key used in commissioning process
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getNetworkKey')
        *
        * @method getNetworkKey
        * @return {Object} returns 16 bytes of network key
        */
        getNetworkKey: function() {
            return this.znpController.getNVItem(DEFINES.NV_ITEM_ID.NWKKEY).then(function(data) {
                return new Buffer(data).slice(1, 17);
            })
        },

        /**
        * Get value of non-volatile item of ZNP stack running on cc2530. Refer defs.js for more info
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getNVItem', 0x0001)
        *
        * @method getNVItem
        * @param {Number} nvId 2 byte id of the nv item
        * @return {Object} returns the value of the nv item requested
        */
        getNVItem: function(id) {
            return this.znpController.getNVItem(id);
        },

        /**
        * Explicit LQI request to specified network address device
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('sendLqiRequest', 0x2345)
        *
        * @method sendLqiRequest
        * @param {Number} nwkAddr specify network address (short address 2 bytes) of the node from which you want to request link quality estimation. 0x0000 is server
        */
        sendLqiRequest: function(dstAddr) {
            return this.znpController.sendLqiRequest(dstAddr);
        },

        /**
        * Get the network topology of existing zigbee network
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getNetworkTopology')
        *
        * @method getNetworkTopology
        * @return {Object} returns the network topology with device type and child count
        */
        getNetworkTopology: function() {
            return this.znpController.getNetworkTopology();
        },

        /**
        * Ping all the nodes in ZigBee network and return topology
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('ping')
        *
        * @method ping
        * @return {Object} returns the network topology with device type, child count and life status
        */
        ping: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                self.commands.sendLqiRequest().then(function() {
                    setTimeout(function() {
                        resolve(self.commands.getNetworkTopology());
                    }, 1500);
                }, function(err) {
                    reject(err);
                });
            });
        },

        /**
        * Get life status of each node in the network
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('status')
        *
        * @method status
        * @return {Object} returns the status of each node in the network
        */
        status: function() {
            return this.znpController.getStatus();
        },

        /**
        * Get all the onboarded nodes metadata
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('getNodes')
        *
        * @method getNodes
        * @return {Object} returns an object which has all the nodes metadata onboarded on the module
        */
        getNodes: function() {
            return this.znpController.getNodes();
        },

        /**
        * Change log level
        *
        * Usage: dev$.selectByID('ZigbeeDriver').call('logLevel', 3)
        *
        * @method logLevel
        * @return {Number} level info- 2, debug- 3, trace- 4, error- 0, warn- 1
        */
        logLevel: function(level) {
            if(typeof level === 'number' && level >= 0) {
                global.GLOBAL.ZigbeeLogLevel = level;
            }
        },

        formatData: function(data, type) {
            return this.znpController.formatWriteAttrData(data, type);
        },

        announcement: function(srcAddr) {
            return this.znpController.endDeviceAnnce({srcAddr: srcAddr, nwkAddr: srcAddr});
        },

        restart: function() {
            return this.znpController.restart();
        },

        setPairer: function(pairer) {
            this.devicePairer = pairer;
        },

        startDevicePairer: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                if(typeof self.devicePairer !== 'undefined') {
                    self.devicePairer.stop().then(function() {
                        logger.info('Device pairer stopped successfully');
                    }, function(err) {
                        logger.error('Failed to stop device pairer ' + err);
                        return;
                    }).then(function() {
                        self.devicePairer.start({znpController: self.znpController}).then(function(){
                            logger.info('ZigbeeHA device pairer started successfully');
                            resolve('Device pairer started successfully');
                        }, function(err) {
                            logger.error('Failed to start device pairer ' + err);
                            reject(err);
                        });
                    });
                }
            });
        },

        stopPing: function() {
            return this.znpController.stopNetworkRefresh();
        },

        startPing: function() {
            return this.znpController.startPeriodicNetworkRefresh();
        },

        getQueueLength: function() {
            return this.znpController.getZclQueuelength();
        }
    }
};

module.exports = {
    ZigbeeDriver: dev$.resource('ZigbeeHA/Monitor', ZigbeeDriver)
};