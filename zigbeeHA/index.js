var ZNPController = require('./src/znpcontroller').ZNPController;
var Multiplexer = require('./src/multiplexer').Multiplexer;
var DEFINES = require('./lib/defs').DEFINES;
var Logger = require('./utils/logger');
var Promise = require('es6-promise').Promise;
var configurator = require('devjs-configurator');
var jsonminify = require('jsonminify');
var fs = require('fs');
var underscore = require('underscore');
var handleBars = require('handlebars');
var mkdirp = require('mkdirp');

var SupportedClusterClasses = require('./supportedClusterClasses.json')

var ZigbeeDriver = require('./controllers/monitor/controller').ZigbeeDriver;
var DevicePairer = require('./controllers/devicePairer/device-pairer-controller');
var Probe802154 = null;

var options;

var deviceSupportPath = __dirname + '/controllers/supportedDeviceTypes/';
var deviceConfigFileName = 'zigbee.json';
var deviceResourceFileName = 'config.json';
var controllerFileName = 'controller'; //no need for .js

var devices = {};
var devjs_interfaces = null;
var devjs_resourceTypes = null;
var numDevices = 0;

var znpHandler = null;
var devicePairer = null;
var monitor = null;
var monitorId = 'ZigbeeDriver';
var probeZigbeeHARadio = null;
var znpStartRetries = 50;

var initialDeviceStates = {};

var generic_templateDir = __dirname + '/controllers/generic_device_controller';
var generic_configFileName = generic_templateDir + '/zigbee.json';
var generic_resourceFileName = generic_templateDir + '/config.json';
var generic_controllerFileName = generic_templateDir + '/controller.js';

var deviceSupportPath = __dirname + '/controllers/supportedDeviceTypes/';
var deviceConfigFileName = 'zigbee.json';
var deviceResourceFileName = 'config.json';
var controllerFileName = 'controller'; //no need for .js

var autogen_dir = __dirname + '/controllers/autogenDeviceTypes';

var runningStatus = false;
var runningStatusTimer;

var logger = new Logger( {moduleName: 'Manager', color: 'green'} );

function checkOptionsInDatabase() {
    return new Promise(function(resolve, reject) {
        ddb.local.get('zigbeeHA:networkCreated').then(function(value) {
            if(value === null || value.siblings.length === 0) {
                options.newNwk = true;
            } else {
                value = JSON.parse(value.siblings[0]);
                if(typeof value === 'object') {
                    value = value.flag;
                } else {
                    ddb.local.put('zigbeeHA:networkCreated', JSON.stringify({flag: value, timestamp: new Date().toString()}));
                }
                if(!value) {
                    options.newNwk = true;
                }  
            }
        }).then(function() {
            ddb.local.get('zigbeeHA:useStoredOptions').then(function(value) {
            	if(value === null || value.siblings.length === 0) {
                    value = false;
                } else {
                    value = JSON.parse(value.siblings[0]);
                }

                if(value) {
                    ddb.local.put('zigbeeHA:useStoredOptions', JSON.stringify(false));
                    ddb.local.get('zigbeeHA:newOptions').then(function(newOptions) {
                    	if(newOptions === null || newOptions.siblings.length === 0) {
    		                newOptions = options;
    		            } else {
    		                newOptions = JSON.parse(newOptions.siblings[0]);
    		            }
                        logger.info('Using options from database ' + JSON.stringify(newOptions));
                        options = newOptions;
                        resolve();
                    }, function(err) {
                        logger.error('Getting options from database failed with error ' + JSON.stringify(err));
                        resolve();
                    });
                } else {
                    resolve();
                }
            }, function(err) {
                logger.error('Could not get useStoredOptions from database ' + JSON.stringify(err));
                resolve();
            });
        });
    });
}

function startResetTimer() {
    clearTimeout(runningStatusTimer);
    runningStatusTimer = setTimeout(function() {
        if(!runningStatus) {
            logger.warn('Process did not start so killing it and waiting for Runner to restart it...');
            process.exit(1);
        }
    }, 60000);
}


function start() {
    ZNPController = require('./src/znpcontroller').ZNPController;
    Multiplexer = require('./src/multiplexer').Multiplexer;
    DEFINES = require('./lib/defs').DEFINES;
    Logger = require('./utils/logger');
    configurator = require('devjs-configurator');
    jsonminify = require('jsonminify');
    fs = require('fs');
    underscore = require('underscore');
    handleBars = require('handlebars');
    mkdirp = require('mkdirp');

    SupportedClusterClasses = require('./supportedClusterClasses.json')

    ZigbeeDriver = require('./controllers/monitor/controller').ZigbeeDriver;
    DevicePairer = require('./controllers/devicePairer/device-pairer-controller');
    Probe802154 = null;

    deviceSupportPath = __dirname + '/controllers/supportedDeviceTypes/';
    deviceConfigFileName = 'zigbee.json';
    deviceResourceFileName = 'config.json';
    controllerFileName = 'controller'; //no need for .js

    devices = {};
    devjs_interfaces = null;
    devjs_resourceTypes = null;
    numDevices = 0;

    znpHandler = null;
    devicePairer = null;
    monitor = null;
    monitorId = 'ZigbeeDriver';
    probeZigbeeHARadio = null;
    znpStartRetries = 50;

    generic_templateDir = __dirname + '/controllers/generic_device_controller';
    generic_configFileName = generic_templateDir + '/zigbee.json';
    generic_resourceFileName = generic_templateDir + '/config.json';
    generic_controllerFileName = generic_templateDir + '/controller.js';

    deviceSupportPath = __dirname + '/controllers/supportedDeviceTypes/';
    deviceConfigFileName = 'zigbee.json';
    deviceResourceFileName = 'config.json';
    controllerFileName = 'controller'; //no need for .js

    autogen_dir = __dirname + '/controllers/autogenDeviceTypes';

    runningStatus = false;
    runningStatusTimer = null;

    logger = new Logger( {moduleName: 'Manager', color: 'green'} );

    logger.info('Starting the process....');
    startResetTimer();
    //---------------------------------------------------------------------
    configurator.configure("zigbeeHA", __dirname).then(function(data) {
        options = data;

        //Set loglevel
        global.ZigbeeLogLevel = options.logLevel || 2;

    	checkOptionsInDatabase().then(function() {
    		znpHandler = new ZNPController(options);
    		devicePairer = new DevicePairer('ZigbeeHA/DevicePairer');
    		monitor = new ZigbeeDriver(monitorId);

    		znpHandler.on('factoryReset', function() {
    		    znpHandler.deleteZigbeeDatabase().then(function() {
                    logger.info('FactoryReset: deleted database, restarting module in 10 seconds');
                    setTimeout(function() {
                        process.exit(1);
                    }, 10000);
    		    });
    		});

            znpHandler.on('restart', function() {
                runningStatus = false;
                logger.info('Restarting the process....');
                startResetTimer();
                monitor.stop().then(function() {
                    logger.info('Monitor stopped succesfully');
                    devicePairer.stop().then(function() {
                        logger.info('DevicePairer stopped succesfully');

                        stopControllers();
                        setTimeout(function() {
                            start();
                        }, 15000);
                    });
                });
            });

    		znpHandler.on('restartModule', function(newNwk, panId, channel) {
    		    logger.warn('restartModule: Restaring the module, new nwk ' + newNwk + ' panId ' + panId + ' channel ' + channel);

                var newOptions = options;
                if(typeof newNwk !== 'undefined') {
                    newOptions.newNwk = !!newNwk;
                }
                if(typeof panId !== 'undefined') {
                    newOptions.panIdSelection = 'fixed';
                    newOptions.panId = panId;
                }
                if(typeof channel !== 'undefined') {
                    if(channel < 11 || channel > 25) {
                        logger.error('Channel should be between 11-25, got- ' + channel + ' using default 25');
                        channel = 25;
                    }
                    newOptions.channelMask = channel;
                }
                ddb.local.put('zigbeeHA:useStoredOptions', JSON.stringify(true)).then(function() {
                    ddb.local.put('zigbeeHA:newOptions', JSON.stringify(newOptions)).then(function() {
                        logger.warn('Saving new options ' + JSON.stringify(newOptions) + ' killing the process!');
                        // process.exit(1);
                        znpHandler.restart();
                    });
                });
    		});

            function startMonitor() {
                monitor.start(znpHandler).then(function() {
                    logger.info('Started monitor with id ' + monitorId);
                }, function(err) {
                    // delete monitor[id];
                    if(typeof err.status !== 'undefined' && err.status == 500 && err.response == 'Already registered') {

                    } else {
                        logger.error('Could not start the monitor ' + JSON.stringify(err) + ' will try again in 5 seconds!');
                        setTimeout(function() {
                            startMonitor();
                        }, 5000);
                    }
                });
            }

            function startPairer() {
                devicePairer.start({
                    znpController: znpHandler
                }).then(function(){
                    logger.info('ZigbeeHA device pairer started successfully');
                    monitor.commands.setPairer(devicePairer);
                }, function(err) {
                    if(typeof err.status !== 'undefined' && err.status == 500 && err.response == 'Already registered') {

                    } else {
                        logger.error('ZigbeeHA device pairer failed: ' + JSON.stringify(err) + ' error ' + err + ' will try again in 5 seconds!');
                        setTimeout(function() {
                            startPairer();
                        }, 5000);
                    }
                });
            }

    		function startZigbeeHA() {
    		    logger.info('Probe Zigbee HA worked succesfully, starting zigbee HA...');

                startMonitor();

    		    znpHandler.setState(false);

    		    znpHandler.start(options).then(function() {
                    runningStatus = true;
                    clearTimeout(runningStatusTimer);

    		        znpHandler.setState(true);
    		        logger.info('ZNP controller started succesfully');
                    ddb.local.put('zigbeeHA:networkCreated', JSON.stringify({flag: true, timestamp: new Date().toString()}));

    		        var duration;
    		        if(typeof options.networkRefreshDuration !== 'undefined')
    		            duration = ( (options.networkRefreshDuration < 30000) && (options.networkRefreshDuration > 0) ) ? 30000 : options.networkRefreshDuration;
    		        else
    		            duration = 30000;

                    if(duration > 0) {
                        znpHandler.startPeriodicNetworkRefresh(duration);
                    } else {
                        logger.warn('Periodic network refresh is disabled');
                    }

    		        //turn off permit join.. for some reason on boot permit join is permanent
    		        function disablePermitJoin() {
    		            znpHandler.addDevice(0).then(function() {
    		                logger.info('Permit join disabled succesfully');
    		            }, function() {
                            setTimeout(function() {
                                disablePermitJoin();
                            }, 7000);
    		            });
    		        }

    		        disablePermitJoin();

                    startPairer();

                    ddb.local.get('DevStateManager.DeviceStates').then(function(result) {
                        if (result === null || result.siblings.length === 0) {
                            //throw new Error('No such job');
                            logger.debug('No initial device states found');
                            initialDeviceStates = {};
                        } else {
                            initialDeviceStates = JSON.parse(result.siblings[0]) || {};
                        }

        		        dev$.listResourceTypes().then(function(resourceTypes) {
        		            devjs_resourceTypes = resourceTypes;
        		            return;
        		        }).then(function() {
        		            registerSupportedDevices().then(function() {
        		                logger.info('added resource types successfully');
        		            }, function(error) {
        		                logger.error('registerSupportedDevices failed with error: ' +  JSON.stringify(error));
        		            }).then(function() {
        		                dev$.listInterfaceTypes().then(function(interfaces) {
        		                    devjs_interfaces = interfaces;
        		                    instantiateControllers().then(function() {
        		                        znpHandler.sendLqiRequest();
        		                        znpHandler.requestNetworkTopology();
        		                        logger.info('instantiated all the controllers');
        		                    }, function(error) {
        		                        logger.error('could not instantiate controllers: ' +  JSON.stringify(error));
        		                    });
        		                }, function(err) {
        		                    logger.error('Could not get interfacetypes: ' +  JSON.stringify(error));
        		                });

        		            });
        		        });
                    });
    		    }, function(err) {
    		        znpHandler.setState(false);
    		        logger.error('ZNP controller start failed retrying - ' + znpStartRetries + ' error ' + JSON.stringify(err));
    		        if(znpStartRetries-- > 0) {
    		            setTimeout(function() {
    		                znpHandler.emit('restartModule'); //restart the module in a second -- need to verify if this fix helps talking to znp
    		            }, 1000);
    		        } else {
    		            //notify user that you are going to probe the zigbee and restart everything
    		            logger.error('WAS NOT ABLE TO SETUP COMMUNICATION LINE WITH PROGRAMMED ZNP.. BURNING IT AGAIN. THIS WILL UNPAIR ALL THE BOUND DEVICE AND USER WILL HAVE TO REPAIR IT AGAIN');
    		            znpHandler.emit('fullZigbeeReboot');
    		        }
    		    });

    		    znpHandler.connect().then(function() {
    		        logger.info('Connection with znp module established succesfully');
    		    }, function() {
    		        znpHandler.setState(false);
    		        logger.error('Connection could not be established');
    		        return;
    		    });

    		    znpHandler.on('node discovered', function(nodeId, nodeInfo) {
    		        logger.info('Node discovered ' + nodeInfo.nwkAddr);
    		        if(nodeInfo.profileID == 0xC05E || nodeInfo.profileID == 0x0104) {
                        znpHandler.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.GET_MANUFACTURER_INFO);
    		           	znpHandler.identifyDiscoveredNode(nodeId, nodeInfo);
    				}
    		    });

    		    znpHandler.on('node identified', function(nodeId, nodeInfo) {
    		        // log.info('Node identified ', nodeId, nodeInfo);
    				znpHandler.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.INIT_CONTROLLER);
    		        startDeviceController(nodeId, nodeInfo, false).then(function() {
    		            logger.info('device controller successfully started');
    		            znpHandler.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.COMMISSIONING_COMPLETE);
    		        }, function(e) {
    		            logger.error('device controller failed with error- ' +  JSON.stringify(e) + ' ' + e);
    		            znpHandler.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.FAILED);
    		        });
    		    });
    		}

    		function startModule() {
                //Check on laptop vs wigwag gateway
    		    if(typeof options.platform !== 'undefined' && options.platform.indexOf('wwgateway') > -1) {
    		        Probe802154 = require(__dirname + '/../rsmi/index.js').Probe802154;
    		        var radioProfile = JSON.parse(jsonminify(fs.readFileSync( __dirname + '/../rsmi/radioProfile.config.json', 'utf8')));

                    var hwversion = radioProfile.hardwareVersion;
                    var radioConfig = radioProfile.radioConfig;
                    var map = radioProfile.configurations[hwversion][radioConfig]["zigbeeHA"] || [];
                    var radioOptions = map[0] ? Object.assign({}, radioProfile.pcb_map[hwversion][map[0]], 
                        radioProfile.modules["zigbeeHA"][map[1]], {"module": "zigbee"}) : undefined;

                    logger.info('Starting module on radio options from radioProfile.config.json- ' + JSON.stringify(radioOptions));

    		        if(typeof radioOptions == 'undefined') {
    		            //use default
    		            // radioOptions = defaultRadioOptions;
                        clearTimeout(runningStatusTimer);
    		            logger.error('Radio options are not defined in the radioProfile.config.json. Most likely ZigBee module is not installed on this hardware.');
    		        } else {
                        options.siodev = radioOptions.siodev;
                        options.baudrate = radioOptions.baudrate;

                        //Probe the module based on UART
                        probeZigbeeHARadio = new Probe802154(radioOptions);

                        var probeAndStartZigbee = function() {
                            probeZigbeeHARadio.start({verify: false, verbose: true, forceBurn: true}).then(function() {
                                startResetTimer();
                                logger.info('ZigbeeHA handshake and programming succesful, starting znp');
                                ddb.local.put('zigbeeHA:alreadyProgrammed', JSON.stringify({flag: true, timestamp: new Date().toString()}));
                                startZigbeeHA();
                            }, function(err) {
                                logger.error('Zigbee HA start failed with error: ' +  JSON.stringify(err));
                            });
                        };

                        ddb.local.get('zigbeeHA:alreadyProgrammed').then(function(value) {
                            if(value === null || value.siblings.length === 0) {
                                value = false;
                            } else {
                                value = JSON.parse(value.siblings[0]);
                                if(typeof value === 'object') {
                                    value = value.flag;
                                } else {
                                    ddb.local.put('zigbeeHA:alreadyProgrammed', JSON.stringify({flag: value, timestamp: new Date().toString()}));
                                }
                            }

                            if(value) {
                                logger.info('ZigbeeHA already programmed.. skipping handshake and starting znp');
                                probeZigbeeHARadio.setup802154GPIOs().then(function() {
                                    startZigbeeHA();
                                });
                            } else {
                                clearTimeout(runningStatusTimer);
                                probeAndStartZigbee();
                            }
                        }, function(e) {
                            clearTimeout(runningStatusTimer);
                            probeAndStartZigbee();
                        });
                    }
    		    } else {
    		        startZigbeeHA();
    		    }
    		}

    		startModule();
    	});

    },function(err){
        log.error('Unable to load zigbeeHA configuration error, ', err);
    });

}

//---------------------------------------------------------------------
function registerSupportedDevices() {
    logger.info('Going to walk down the device support directory');

    return new Promise(function(resolve, reject) {
        //Read the database and walk the device support directory to start the controllers
        fs.readdir(deviceSupportPath, function (err, list) {
            if(err) {
                logger.error('Could not read the device support directory ' + deviceSupportPath + JSON.stringify(err));
                reject(new Buffer('Could not read the device support directory'));
            }

            logger.info('device directories: ' + JSON.stringify(list));

            var it = 0;
            var ret = 0;
            list.forEach(function (dir) {
                fs.stat(deviceSupportPath + dir, function(err, stats) {
                    if(err) {
                        logger.error('dir fs stat failed ' +  JSON.stringify(err));
                    } else {
                        ret = stats.isDirectory();
                        if(ret !== 'undefined') {
                            //If it is the directory, then it should contain config.json file
                            var deviceconfigfile = deviceSupportPath + dir + "/" + deviceConfigFileName;
                            fs.stat(deviceconfigfile, function(err, stats) {
                                if(err) {
                                    it++;
                                    logger.error('file fs stat failed ' +  JSON.stringify(err));
                                } else {
                                    ret = stats.isFile();
                                    if(ret !== 'undefined') {
                                        var resourceconfigfile = deviceSupportPath + dir + "/" + deviceResourceFileName;
                                        fs.stat(resourceconfigfile, function(err, stats) {
                                            if(err) {
                                                it++;
                                                logger.error('file fs stat failed ' +  JSON.stringify(error));
                                            } else {
                                                ret = stats.isFile();
                                                if(ret !== 'undefined') {
                                                    var deviceconfig = JSON.parse(jsonminify(fs.readFileSync(deviceconfigfile, 'utf8')));
                                                    var resourceconfig = JSON.parse(jsonminify(fs.readFileSync(resourceconfigfile, 'utf8')));

                                                    if(typeof deviceconfig.enabled !== 'undefined') {
                                                        if(deviceconfig.enabled) {
                                                            //Fill required device information
                                                            var signature = new Buffer(deviceconfig.ManufacturerName + deviceconfig.ModelIdentifier).toString('base64');
                                                            var controllerPath = deviceSupportPath + dir + "/" + controllerFileName;

                                                            devices[signature] = {
                                                                controllerpath: '',
                                                                resource: '',
                                                                instances: {},
                                                                options: {}
                                                            };

                                                            devices[signature]['controllerpath'] = controllerPath;

                                                            if((typeof devjs_resourceTypes[resourceconfig.name] !== 'undefined') &&
                                                                (devjs_resourceTypes[resourceconfig.name]['0.0.1'].interfaces.length == resourceconfig.interfaces.length) &&
                                                                (!underscore.difference(devjs_resourceTypes[resourceconfig.name]['0.0.1'].interfaces, resourceconfig.interfaces).length)) {
                                                                it++;
                                                                logger.info('already supported device: ' + dir);

                                                                if(list.length == it) {
                                                                    resolve();
                                                                }
                                                            } else {
                                                                dev$.addResourceType(resourceconfig).then(function () {
                                                                    it++;
                                                                    logger.info('adding new device support for: ' + dir);

                                                                    if(list.length == it) {
                                                                        resolve();
                                                                    }
                                                                }, function(e) {
                                                                    logger.error('could not add resource type ' + dir);
                                                                });
                                                            }
                                                        } else {
                                                            logger.info('devices disabled: ' + dir);
                                                            it++;
                                                            if(list.length == it) {
                                                                resolve();
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    logger.warn('Unknown file found in device support directory: ' + resourceconfigfile);
                                                }
                                            }
                                        });
                                    } else {
                                        logger.warn('Unknown file found in device support directory: ' +  deviceconfigfile);
                                    }
                                }
                            });
                        } else {
                            logger.warn('Unknown directory found in device support directory: ' + dir);
                        }
                    }
                });
            });
        });
    });
}

//---------------------------------------------------------------------
function startDeviceController(nodeid, nodeinfo, isAutoGen) {
    //signature --> device type
    //resource --> device instance

    return new Promise(function (resolve, reject) {
        logger.info('Creating device controller on info ' + JSON.stringify(nodeinfo));

        nodeinfo.ModelIdentifier = (typeof nodeinfo.ModelIdentifier === 'string') ? nodeinfo.ModelIdentifier.replace(/[/ ]/g,'_') : '';
        nodeinfo.ManufacturerName = (typeof nodeinfo.ManufacturerName === 'string') ? nodeinfo.ManufacturerName.replace(/[/ ]/g,'_') : 'ZigbeeDevice';

        var signature = new Buffer(nodeinfo.ManufacturerName + nodeinfo.ModelIdentifier).toString('base64');
        // console.log('signature: ', signature);
        logger.info('Starting device controller- ' + JSON.stringify(nodeinfo.nwkAddr) + ' signature ' + signature);

        try {
            if(devices[signature]) {
                if(!devices[signature]['resource']) {
                    devices[signature]['resource'] = require(devices[signature]['controllerpath']);
                    logger.info(nodeid + ' starting the resource... ' + JSON.stringify(devices[signature]['controllerpath']));
                }

                //Check if this device was previously discovered
                var resourceID = nodeinfo.ManufacturerName + nodeinfo.ModelIdentifier + nodeid.toString();
                znpHandler.nodes[nodeid].resourceID = resourceID;
                // console.log('resourceID: ', resourceID);
                if(typeof devices[signature]['instances'][resourceID] === 'undefined') {
                    devices[signature]['instances'][resourceID] = new devices[signature]['resource'](resourceID);
                    var multiplexer = new Multiplexer(znpHandler, nodeid);
                    var options = {
                        nodeId: nodeid, 
                        znpController: znpHandler, 
                        interfaces: devjs_interfaces, 
                        endPoint: nodeinfo.endpoint, 
                        multiplexer: multiplexer,
                        initialState: initialDeviceStates[resourceID] || {}
                    };
                    devices[signature].options = options;
                    multiplexer.start().then(function() {
                        devices[signature]['instances'][resourceID].start(options).then(function() {
                            numDevices++;
                            logger.info(nodeid + ' device instance ' + resourceID + ' created successfully, total number of zigbeeHA devices: ' + numDevices);
                            znpHandler.emit('reachable ' + nodeid, true);
                            nodeinfo.deviceControllerCreated = true;
                            ddb.local.put('zigbeeHA:devices.' + nodeid, JSON.stringify(nodeinfo));
                            resolve({signature: signature, resourceID: resourceID});
                        }, function(error) {
                            if(typeof error.status !== 'undefined' && error.status === 500 && error.response == 'Already registered') {
                                logger.warn('Controller already exists: ' + JSON.stringify(error));
	                            ddb.local.put('zigbeeHA:devices.' + nodeid, JSON.stringify(nodeinfo));
                                resolve({signature: signature, resourceID: resourceID});
                                return;
                            } else {
                                //Try again in sometime
                                logger.error('Failed to start controller on ' + nodeid + ' error ' + JSON.stringify(error) + ' will try again in 10 seconds!');
                                setTimeout(function() {
                                    startDeviceController(nodeid, nodeinfo, isAutoGen);
                                }, 10000);
                            }
                            logger.error(nodeid + ' could not start the controller ' + JSON.stringify(error));
                            delete devices[signature]['instances'][resourceID];
                            // numDevices--;
                            reject();
                        });
                    });
                } else {
                    logger.warn(nodeid + ' rediscovered device, controller already exists');
                    ddb.local.put('zigbeeHA:devices.' + nodeid, JSON.stringify(nodeinfo));
                    resolve({signature: signature, resourceID: resourceID});
                }
            } else {
                // logger.warn(nodeid + ' device support do not exists');
                // ddb.delete('zigbeeHA:devices.' + nodeid);
                // reject(new Error('Device support do not exists!'));

                if(!isAutoGen) {
                    znpHandler.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.AUTOGEN_CONTROLLER);
                    autoGenerateDeviceController(nodeid, nodeinfo).then(function(opts) {
                        logger.info('Successfully created auto generated device controller');
                        resolve(opts);
                    }, function(err) {
                        logger.error('Could not auto generate the controller- ' + err);
                        reject(err);
                    });
                }
            }
        } catch(e) {
            logger.error(nodeid + ' startDeviceController error: ' + JSON.stringify(e) + ' stack ' + JSON.stringify(e.stack));
            reject(e);
        }
    });
}

function stopDeviceController(nodeid, nodeinfo) {
    
    return new Promise(function (resolve, reject) {
        logger.info('Stopping device controller with info ' + JSON.stringify(nodeinfo));

        nodeinfo.ModelIdentifier = (typeof nodeinfo.ModelIdentifier === 'string') ? nodeinfo.ModelIdentifier.replace(/[/ ]/g,'_') : '';
        nodeinfo.ManufacturerName = (typeof nodeinfo.ManufacturerName === 'string') ? nodeinfo.ManufacturerName.replace(/[/ ]/g,'_') : 'ZigbeeDevice';

        var signature = new Buffer(nodeinfo.ManufacturerName + nodeinfo.ModelIdentifier).toString('base64');
        // console.log('signature: ', signature);
        logger.info('Stopping device controller- ' + JSON.stringify(nodeinfo.nwkAddr) + ' signature ' + signature);

        try {
            if(devices[signature]) {
                // if(!devices[signature]['resource']) {
                //     devices[signature]['resource'] = require(devices[signature]['controllerpath']);
                //     logger.info(nodeid + ' stopping the resource... ' + JSON.stringify(devices[signature]['controllerpath']));
                // }

                //Check if this device was previously discovered
                var resourceID = nodeinfo.ManufacturerName + nodeinfo.ModelIdentifier + nodeid.toString();
                // znpHandler.nodes[nodeid].resourceID = resourceID;
                // console.log('resourceID: ', resourceID);
                if(typeof devices[signature]['instances'][resourceID] !== 'undefined') {
                    // devices[signature]['instances'][resourceID] = new devices[signature]['resource'](resourceID);
                    // var multiplexer = new Multiplexer(znpHandler, nodeid);
                    // var options = {nodeId: nodeid, znpController: znpHandler, interfaces: devjs_interfaces, endPoint: nodeinfo.endpoint, multiplexer: multiplexer};
                    // multiplexer.start().then(function() {
                        devices[signature]['instances'][resourceID].stop().then(function() {
                            // numDevices++;
                            devices[signature].options.multiplexer.stop();
                            delete devices[signature].options.multiplexer;
                            numDevices--;
                            logger.info(nodeid + ' device instance ' + resourceID + ' stopped successfully, total number of zigbeeHA devices: ' + numDevices);
                            // znpHandler.emit('reachable ' + nodeid, true);
                            // nodeinfo.deviceControllerCreated = true;
                            // ddb.local.put('zigbeeHA:devices.' + nodeid, JSON.stringify(nodeinfo));
                            // resolve({signature: signature, resourceID: resourceID});
                            resolve();
                        }, function(error) {
                            // if(typeof error.status !== 'undefined') {
                            //     if(error.status === 500) {
                            //         logger.warn('Controller already exists: ' + JSON.stringify(error));
                            //         // ddb.local.put('zigbeeHA:devices.' + nodeid, JSON.stringify(nodeinfo));
                            //         resolve({signature: signature, resourceID: resourceID});
                            //         return;
                            //     }
                            // }
                            logger.error(nodeid + ' could not stop the controller ' + JSON.stringify(error));
                            delete devices[signature]['instances'][resourceID];
                            // numDevices--;
                            reject();
                        });
                    // });
                } 
                // else {
                //     logger.warn(nodeid + ' rediscovered device, controller already exists');
                //     ddb.local.put('zigbeeHA:devices.' + nodeid, JSON.stringify(nodeinfo));
                //     resolve({signature: signature, resourceID: resourceID});
                // }
            } else {
                // logger.warn(nodeid + ' device support do not exists');
                // ddb.delete('zigbeeHA:devices.' + nodeid);
                // reject(new Error('Device support do not exists!'));

                // if(!isAutoGen) {
                //     znpHandler.emit('pairingProgressEvent', DEFINES.PAIRING_STAGE.AUTOGEN_CONTROLLER);
                //     autoGenerateDeviceController(nodeid, nodeinfo).then(function(opts) {
                //         logger.info('Successfully created auto generated device controller');
                //         resolve(opts);
                //     }, function(err) {
                //         logger.error('Could not auto generate the controller- ' + err);
                //         reject(err);
                //     });
                // }
            }
        } catch(e) {
            logger.error(nodeid + ' stopDeviceController error: ' + JSON.stringify(e) + ' stack ' + JSON.stringify(e.stack));
            reject(e);
        }
    });
}

function autoGenerateDeviceController(nodeId, nodeInfo) {
    // var nodeInfo = node.metaData();
    // var nodeId = node.id();

    //TODO- need to define this with the manufacturer information
    // nodeInfo.ManufacturerName = "ZigBee";

    logger.warn(nodeId + ' device support does not exists');
    //Todo: Throw an event to inform deviceJS that we are about to onboard a device which is not yet compatible with WigWag
    //Start generic controller
    logger.warn(nodeId + ' auto generating controller');

    var generalNodeInfo = {
        "ManufacturerName": "ZigBee",
        "ModelIdentifier": nodeId.toString(),
        "controller": "Generic" + nodeId.toString() + "_autogen"
    };

    nodeInfo.ManufacturerName = nodeInfo.ManufacturerName || generalNodeInfo.ManufacturerName;
    nodeInfo.ModelIdentifier = (nodeInfo.ModelIdentifier != "0000" && nodeInfo.ModelIdentifier !== '') ? nodeInfo.ModelIdentifier.replace(/[^a-zA-Z0-9]/g,'_') : generalNodeInfo.ModelIdentifier;

    var controllerClassName = nodeInfo.ManufacturerName.replace(/[^a-zA-Z0-9]/g,'_') + nodeInfo.ModelIdentifier.replace(/[^a-zA-Z0-9]/g,'_');

    logger.debug('Creating controller class name- ' + controllerClassName);

    var signature = new Buffer(nodeInfo.ManufacturerName + nodeInfo.ModelIdentifier).toString('base64');

    // var signature = new Buffer( (nodeInfo.manufacturer) +
    //                         (nodeInfo.manufacturerId) +
    //                         (nodeInfo.productId) +
    //                         (nodeInfo.productType)).toString('base64');

    var controller_dir = autogen_dir + '/' + controllerClassName;

    return new Promise(function(resolve, reject) {
        //need to create directories and generate controllers and then start it.
        mkdirp(autogen_dir, function(err) {
            // path was created unless there was error
            if(err) {
                logger.error(autogen_dir + ' dir could not be created ' + err);
                //controller generation failed, report that
            } else {
                mkdirp(controller_dir, function(err) {
                    if(err) {
                        logger.error(controller_dir + ' dir could not be created ' +  err);
                    } else {

                        logger.info(nodeId + ': created ' + controller_dir + ' directory');

                        //config.json
                        var resourceconfig;
                        var devicecontroller;
                        var deviceconfig;
                        return new Promise(function(resolve, reject) {

                            resourceconfig = JSON.parse(jsonminify(fs.readFileSync(generic_resourceFileName, 'utf8')));
                            devicecontroller = fs.readFileSync(generic_controllerFileName, 'utf8');
                            deviceconfig = JSON.parse(jsonminify(fs.readFileSync(generic_configFileName, 'utf8')));
                            resourceconfig.name += controllerClassName;

                            nodeInfo['inClusterList'].forEach(function(id) {
                                if(typeof SupportedClusterClasses[id] !== 'undefined') {
                                    if(typeof SupportedClusterClasses[id].devjsInterface !== 'undefined') {
                                        Object.keys(SupportedClusterClasses[id].devjsInterface).forEach(function(facade) {
                                            if(resourceconfig.interfaces.indexOf(facade) <= -1) {
                                                resourceconfig.interfaces.push(facade);
                                            }
                                        });
                                    }
                                }

                                try {
                                    if(typeof SupportedClusterClasses[id] !== 'undefined') {
                                        deviceconfig.cluster_classes.push(SupportedClusterClasses[id].cluster_class);
                                    }
                                } catch(e) {
                                    logger.error('Adding cluster class failed ' + JSON.stringify(e));
                                }
                            });

                            fs.writeFile(controller_dir + '/config.json', JSON.stringify(resourceconfig, null, 4), function(err) {
                                if(err) {
                                    logger.error('autogen: could not create config.json for node '+ nodeId + JSON.stringify(err));
                                    reject(err);
                                } else {
                                    logger.info(nodeId + ': created ' + controller_dir + '/config.json file');
                                    resolve();
                                }
                            });
                        }).then(function(options) {
                            //zigbee.json
                            return new Promise(function(resolve, reject) {
                                try{
                                    var template = handleBars.compile(JSON.stringify(deviceconfig));
                                    var data = {};
                                    data.ManufacturerName = nodeInfo.ManufacturerName;
                                    data.ModelIdentifier = nodeInfo.ModelIdentifier;
                                    data.controller = controllerClassName;
                                    data.signature = signature;
                                    data.value = "{{value}}" //This put backs the handle bar used by the interface pattern
                                    deviceconfig = JSON.parse(template(data));
                                    fs.writeFile(controller_dir + '/zigbee.json', JSON.stringify(deviceconfig, null, 4), function(err) {
                                        if(err) {
                                            logger.error('autogen: could not create zigbee.json for node '+ nodeId + JSON.stringify(err));
                                            reject();
                                        } else {
                                            logger.info(nodeId + ': created ' + controller_dir + '/zigbee.json file');
                                            resolve();
                                        }
                                    });
                                } catch (e) {
                                    logger.error('zigbee.json creation failed- ' + e + e.stack);
                                }
                            });
                        }).then(function() {
                            //controller.js
                            return new Promise(function(resolve, reject) {

                                //controller
                                var template = handleBars.compile(devicecontroller);
                                var data = {};
                                data.controllerClassName = controllerClassName;
                                data.resourceName = resourceconfig.name;
                                devicecontroller = template(data);
                                fs.writeFile(controller_dir + '/controller.js', devicecontroller, function(err) {
                                    if(err) {
                                        logger.error('autogen: could not create controller.js for node '+ nodeId + JSON.stringify(err));
                                        reject(err);
                                    } else {
                                        logger.info(nodeId + ': created ' + controller_dir + '/controller.js file');
                                        resolve();
                                    }
                                });
                            });
                        }).then(function() {
                            logger.info('GOING TO ADD RESOURCE FOR: '+ nodeId + ' signature ' + signature);
                            if(typeof devices[signature] === 'undefined') {
                                //Fill required device information
                                var controllerPath = controller_dir + '/controller';
                                devices[signature] = {
                                    controllerpath: '',
                                    resource: '',
                                    instances: {},
                                    type: 'Autogen'
                                };

                                devices[signature]['controllerpath'] = controllerPath;

                                if((typeof devjs_resourceTypes[resourceconfig.name] !== 'undefined') &&
                                    (devjs_resourceTypes[resourceconfig.name]['0.0.1'].interfaces.length == resourceconfig.interfaces.length) &&
                                    (!underscore.difference(devjs_resourceTypes[resourceconfig.name]['0.0.1'].interfaces, resourceconfig.interfaces).length)) {

                                    //start the controller and on success resolve it otherwise reject
                                    logger.warn('GOING TO START CONTROLLER FOR: '+ nodeId);
                                    startDeviceController(nodeId, nodeInfo, true).then(function(opts) {
                                        logger.info('Created device controller');
                                        resolve(opts);
                                    }, function(err) {
                                        reject(err);
                                    });
                                } else {
                                    dev$.addResourceType(resourceconfig).then(function () {
                                        //start the controller and on success resolve it ot herwise reject
                                        logger.warn('GOING TO START CONTROLLER FOR AFTER ADDING NEW RESOURCE TYPE: '+ nodeId);
                                        startDeviceController(nodeId, nodeInfo, true).then(function(opts) {
                                            logger.info('Created device controller');
                                            resolve(opts);
                                        }, function(err) {
                                            reject(err);
                                        });
                                    }, function(e) {
                                        logger.error('could not add resource type ' + dir);
                                        reject(err);
                                    });
                                }
                            } else {
                                logger.warn('GOING TO START CONTROLLER FOR EXISTING SIGNATURE: '+ nodeId);
                                startDeviceController(nodeId, nodeInfo, true).then(function(opts) {
                                    logger.info('Created device controller');
                                    resolve(opts);
                                }, function(err) {
                                    reject(err);
                                });
                            }
                        }).catch(function(err) {
                            logger.error('Could not create auto generated controller '+ JSON.stringify(err));
                            reject(err);
                        });

                    }
                });
            }
        });

    });
}

//---------------------------------------------------------------------
function instantiateControllers() {
    return new Promise(function(resolve, reject) {
        var nodes = {};
        function next(err, result) {
            if(err) {
                return;
            }

            var prefix = result.prefix;
            var nodeId = result.key.substring(prefix.length);

            var siblings = result.siblings;
            if(siblings.length != 0) {
                try {
                    var deviceMetadata = JSON.parse(siblings[0]);
                    nodes[nodeId] = deviceMetadata;
                } catch(e) {
                    logger.error("json parse failed with error- " + e);
                }
            } else {
                logger.error("Key was deleted");
            }
        }

        ddb.local.getMatches('zigbeeHA:devices.', next).then(function() {
            Object.keys(nodes).forEach(function(id) {
                // console.log(nodes[id]);
                if(typeof znpHandler.nodes[id] === 'undefined') {
                    znpHandler.nodes[id] = nodes[id];
                }
                znpHandler.nodes[id]['life'] = 'alive';
                znpHandler.endDeviceAnnce(nodes[id]).then(function() {
                    startDeviceController(nodes[id].nwkAddr, nodes[id]);
                }, function() {
                    logger.error('Unable to register device, ' + id + ' with ZNP: ' + JSON.stringify(nodes[id]));
                });
            });
            resolve();
        }, function(err) {
            reject(err);
        });
    });
}

function stopControllers() {
    return new Promise(function(resolve, reject) {
        var nodes = {};
        function next(err, result) {
            if(err) {
                return;
            }

            var prefix = result.prefix;
            var nodeId = result.key.substring(prefix.length);

            var siblings = result.siblings;
            if(siblings.length != 0) {
                try {
                    var deviceMetadata = JSON.parse(siblings[0]);
                    nodes[nodeId] = deviceMetadata;
                } catch(e) {
                    logger.error("json parse failed with error- " + e);
                }
            } else {
                logger.error("Key was deleted");
            }
        }

        ddb.local.getMatches('zigbeeHA:devices.', next).then(function() {
            Object.keys(nodes).forEach(function(id) {
                // console.log(nodes[id]);
                // if(typeof znpHandler.nodes[id] === 'undefined') {
                //     znpHandler.nodes[id] = nodes[id];
                // }
                // znpHandler.nodes[id]['life'] = 'alive';
                // znpHandler.endDeviceAnnce(nodes[id]).then(function() {
                stopDeviceController(nodes[id].nwkAddr, nodes[id]);
                // }, function() {
                    // logger.error('Unable to register device, ' + id + ' with ZNP: ' + JSON.stringify(nodes[id]));
                // });
            });
            resolve();
        }, function(err) {
            reject(err);
        });
    });
}



start();