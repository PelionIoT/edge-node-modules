var fs = require('fs');
var jsonminify = require('jsonminify');
var Logger = require('./../utils/logger');
var logger = new Logger( {moduleName: 'Manager', color: 'bgBlue'} );

var VirtualDeviceDbPrefix = 'VirtualDriver.devices.';
var VirtualConfigDbPrefix = 'VirtualDriver.config.';
var VirtualDeviceProgressDbPrefix = "VirtualDriver.discoveryReport";

function addResourceType(config) {
    return new Promise(function(resolve, reject) {
        dev$.addResourceType(config).then(function() {
            logger.info('Successfully added resource type ' + config.name);
            resolve();
        }, function(err) {
            logger.error('Could not add resource type ' + JSON.stringify(err));
            return reject('Could not add resource type ' + JSON.stringify(err));
        });
    });
}

var discoverInProgress = false;
var progressReportBuffer = [];

function checkAndReportUpdate() {
    if(!discoverInProgress) {
        discoverInProgress = true;
        setTimeout(function() {
            try {
                var obj = progressReportBuffer.shift();
                if(obj) {
                    self = obj.self;
                    template = obj.template;
                    progress = obj.progress;
                    details = obj.details;
                    if(!self._progressReport[template]) {
                        self._progressReport[template] = {
                            "progressBar": 0,
                            "message": "",
                            "inProgress": false,
                            "count": self._deviceCount[template] || 0
                        };
                    }
                    self._progressReport[template].progressBar = progress;
                    self._progressReport[template].count = self._deviceCount[template] || 0;
                    if(self._progressReport[template].progressBar == 0) {
                        self._progressReport[template].inProgress = false;
                    } else {
                        self._progressReport[template].inProgress = true;
                    }
                    self._progressReport[template].message = details;
                    var data = {
                        [template]: self._progressReport[template]
                    };
                    dev$.publishResourceStateChange("VirtualDeviceDriver", "progress", data);
                    ddb.shared.put(VirtualDeviceProgressDbPrefix, JSON.stringify(self._progressReport));
                    discoverInProgress = false;
                    checkAndReportUpdate();
                } else {
                    discoverInProgress = false;
                }
            } catch(err) {
                logger.error('Failed to update progress report ' + err);
                discoverInProgress = false;
            }
        }, 1500);
    } else {
        setTimeout(function() {
            checkAndReportUpdate();
        }, 500);
    }
}

function updateDiscoverProgress(self, template, progress, details) {
    if(!self._isInitializing) {
        progressReportBuffer.push({self: self, template: template, progress: progress, details: details});
        checkAndReportUpdate();
    }
}

var VirtualDeviceManager = {
    start: function(obj) {
        logger.info('Starting controller');
        this._templateDirectory = __dirname + '/../' + obj.deviceControllersDirectory;
        this._hideTemplates = obj.hideTemplates || [];
        this._controllers = {};
        this._resources = {};
        this._id = 0;
        this._deviceCount = {};
        this._initialDeviceStates = obj.initialDeviceStates;
        this._progressReport = {};
    },
    stop: function() {

    },
    state: {
        templates: {
            get: function() {
                return this.commands.listTemplates();
            }, 
            set: function() {
                return Promise.reject('Read only facade!');
            }
        },
        create: {
            get: function() {
                return Promise.reject('Write only facade!');
            },
            set: function(resource) {
                return this.commands.create(resource);
            }
        },
        start: {
            get: function() {
                return Promise.reject('Write only facade!');
            },
            set: function(obj) {
                return this.commands.start(obj.resource, obj.id);
            }
        },
        stop: {
            get: function() {
                return Promise.reject('Write only facade!');
            },
            set: function(id) {
                return this.commands.stop(id);
            }

        },
        delete: {
            get: function() {
                return Promise.reject('Write only facade!');
            },
            set: function(id) {
                return this.commands.delete(id);
            }

        },
        deleteAll: {
            get: function() {
                return Promise.reject('Write only facade!');
            },
            set: function() {
                return this.commands.deleteAll();
            }

        },
        progress: {
            get: function() {
                return new Promise(function(resolve, reject) {
                    ddb.shared.get(VirtualDeviceProgressDbPrefix).then(function(result) {
                        if(result && result.siblings && result.siblings[0]) {
                            resolve(JSON.parse(result.siblings[0]));
                        } else {
                            reject('Failed to get diagnostics data!');
                        }
                    }, function(err) {
                        reject('Failed to get data ' + err);
                    });
                });
            },
            set: function() {
                return Promise.reject('Read only facade!');
            }
        },
        status: {
            get: function() {
                return Promise.resolve(true);
            },
            set: function() {
                return Promise.reject('Read only facade!');
            }
        },
        devices: {
            get: function() {
                return this.commands.listResources();
            }, 
            set: function() {
                return Promise.reject('Read only facade!');
            }
        }
    },
    commands: {
        register: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                //Read the database and walk the device support directory to start the controllers
                fs.readdir(self._templateDirectory, function (err, list) {
                    if(err) {
                        logger.error('Could not read the device support directory '+ _templateDirectory + JSON.stringify(err));
                        return reject(new Error('Could not read the device support directory'));
                    }
                    list.forEach(function (dir) {
                        self._controllers[dir] = {};
                        self._controllers[dir].path = self._templateDirectory + '/' + dir + '/controller';
                        self._controllers[dir].config = self._templateDirectory + '/' + dir + '/config.json';
                        self._progressReport[dir] = {
                            "progressBar": 0,
                            "message": "",
                            "inProgress": false,
                            "count": self._deviceCount[dir] || 0
                        };
                    });
                    resolve('Successfully registered templates- ' + Object.keys(self._controllers));
                });
            });
        },
        create: function(resource) {
            var self = this;
            return new Promise(function(resolve, reject) {
                dev$.publishResourceStateChange("VirtualDeviceDriver", "progress", {
                    [resource]: {
                        "progressBar": 0,
                        "message": "Received request...",
                        "inProgress": true,
                        "count": self._deviceCount[resource] || 0
                    }
                });

                if(typeof self._controllers[resource] === 'undefined') {
                    updateDiscoverProgress(self, resource, -1, "Failed to find the type- " + resource + " of the virtual device!");
                    setTimeout(function() {
                        updateDiscoverProgress(self, resource, 0, "");
                    }, 2000);
                    logger.error('Failed to find resource named ' + resource);
                    return reject('Failed to find resource named ' + resource);
                }
                if(self._progressReport[resource].inProgress) {
                    updateDiscoverProgress(self, resource, -1, "In progres, try again later!");
                    setTimeout(function() {
                        updateDiscoverProgress(self, resource, 0, "");
                    }, 2000);
                    return reject('In progress, creating a device of type ' + resource + '. Try again later!');
                }

                var resourceconfig = JSON.parse(jsonminify(fs.readFileSync(self._controllers[resource].config, 'utf8')));
                updateDiscoverProgress(self, resource, 10, "Adding resource type...");
                addResourceType(resourceconfig).then(function() {
                    logger.info('path ' + self._controllers[resource].path);
                    var id = 'Virtual' + resource + self.commands.getId();
                    updateDiscoverProgress(self, resource, 25, "Resource type added successfully!");
                    self.commands.start(resource, id).then(function(resp) {
                        if(typeof self._deviceCount[resource] === 'undefined') {
                            self._deviceCount[resource] = 0;
                        }
                        self._deviceCount[resource]++;
                        updateDiscoverProgress(self, resource, 100, "Device controller started successfully!");
                        setTimeout(function() {
                            updateDiscoverProgress(self, resource, 0, "");
                        }, 2000);
                        resolve(resp);
                    }, function(err) {
                        logger.error('Failed to start device controller ' + err + JSON.stringify(err));
                        updateDiscoverProgress(self, resource, -1, "Failed to start device controller");
                        setTimeout(function() {
                            updateDiscoverProgress(self, resource, 0, "");
                        }, 2000);
                        reject(err);
                    });
                }, function(err) {
                    logger.error('Failed to add resource type ' + err + JSON.stringify(err));
                    updateDiscoverProgress(self, resource, -1, "Failed to add resoruce type!");
                    setTimeout(function() {
                            updateDiscoverProgress(self, resource, 0, "");
                    }, 2000);
                    reject(err);
                });
            });
        },
        start: function(resource, id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var Device;
                try {
                    Device = require(self._controllers[resource].path);
                } catch(e) {
                    return reject('Failed to require resource ' + resource + ' error ' + JSON.stringify(e));
                }
                updateDiscoverProgress(self, resource, 50, "Adding the supported interfaces to the controller...");
                var resourceConfig = JSON.parse(jsonminify(fs.readFileSync(self._controllers[resource].config, 'utf8')));
                dev$.listInterfaceTypes().then(function(interfaceTypes) {
                    var devInterfaceStates = [];
                    resourceConfig.interfaces.forEach(function(intf) {
                        if(typeof interfaceTypes[intf] !== 'undefined' && intf.indexOf("Facades") > -1) {
                            try {
                                devInterfaceStates.push(Object.keys(interfaceTypes[intf]['0.0.1'].state)[0]);
                            } catch(e) {
                                logger.error('Failed to parse interface ' + e);
                            }
                        } else {
                            logger.warn('THIS SHOULD NOT HAVE HAPPENED. FOUND INTERFACE WHICH IS NOT SUPPORTED BY DEVICEJS');
                        }
                    });
                    var device = new Device(id);
                    self._resources[id] = device;
                    updateDiscoverProgress(self, resource, 75, "Starting device controller...");
                    device.start({
                        id: id, 
                        supportedStates: devInterfaceStates,
                        initialState: self._initialDeviceStates[id] || {}
                    }).then(function() {
                        logger.info('Started controller with id ' + id);
                        resolve('Started controller with id ' + id);
                        ddb.shared.put(VirtualDeviceDbPrefix + id, resource);
                    }, function(err) {
                        reject(err);
                    });
                });
            });
        },
        stop: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                if(typeof self._resources[id] === 'undefined') {
                    return reject('Did not find resource named ' + id);
                }
                return self._resources[id].stop().then(function() {
                    resolve('Successfully stopped ' + id);
                }, function(err){
                    if(err.status === 404) {
                        logger.warn('Could not stop resource ' + id + JSON.stringify(err));
                        return resolve();
                    }
                    logger.error('Stop failed with error ' + err + JSON.stringify(err));
                    reject(err);
                });
            });
        },
        delete: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                if(typeof self._resources[id] === 'undefined') {
                    return reject('Did not find resource named ' + id);
                }
                return self.commands.stop(id).then(function() {
                    return dev$.forgetResource(id).then(function() {
                        ddb.shared.delete(VirtualDeviceDbPrefix + id);
                        delete self._resources[id];
                        resolve('Deleted successfully ' + id);
                    }, function(err) {
                        logger.error('Delete failed with error ' + err + JSON.stringify(err));
                        reject(err);
                    });
                });
            });
        },
        deleteAll: function() {
            var self = this;
            var p = [];
            return new Promise(function(resolve, reject) {
                Object.keys(self._resources).forEach(function(id) {
                    p.push(self.commands.delete(id));
                });

                Promise.all(p).then(function() {
                    var nodes = {};
                    var p = [];
                    function next(err, result) {
                        if(err) {
                            return;
                        }

                        var prefix = result.prefix;
                        var id = result.key.substring(prefix.length);

                        var siblings = result.siblings;
                        if(siblings.length !== 0) {
                            try {
                                var resource;
                                try {
                                    resource = JSON.parse(siblings[0]);
                                } catch(err) {
                                    resource = siblings[0];
                                }
                                nodes[id] = resource;
                            } catch(e) {
                                logger.error("json parse failed with error- " + e);
                            }
                        } else {
                            logger.error("Key was deleted");
                        }
                    }

                    //Sanity check, verify if the database has some old hanging ids 
                    ddb.shared.getMatches(VirtualDeviceDbPrefix, next).then(function() {
                        Object.keys(nodes).forEach(function(id) {
                           p.push(self.commands.delete(id));
                        });
                        Promise.all(p).then(function() {
                            self._deviceCount = {};
                            resolve();

                            //Delete previous instance resources
                            dev$.select('id=*').listResources().then(function(resources) {
                                Object.keys(resources).forEach(function(id) {
                                    if(resources[id].type.indexOf('Core/Devices/Virtual') > -1) {
                                        dev$.forgetResource(id);
                                    }
                                });
                                logger.info('Deleted all successfully');
                                resolve('Deleted all successfully');
                            });
                        }, function(err) {
                            logger.error('Failed to delete device controllers ' + err + JSON.stringify(err));
                            reject(err);
                        });
                    }, function(err) {
                        logger.error('deleteall, failed to get devices from database ' + err + JSON.stringify(err));
                        reject(err);
                    });
                }, function(err) {
                    reject(JSON.stringify(err));
                });
            });
        },
        logLevel: function(level) {
            if(typeof level === 'number' && level >= 0) {
                global.GLOBAL.VirtualLogLevel = level;
            }
        },
        listDevices: function() {
            return Object.keys(this._resources);
        },
        listResources: function() {
            return this.commands.listDevices();
        },
        getId: function() {
            var ret = ++this._id;
            ddb.shared.put(VirtualConfigDbPrefix + 'idCounter', JSON.stringify(ret));
            return ret;
        },
        list: function() {
            var list = [];
            list = Object.keys(this._controllers);
            this._hideTemplates.forEach(function(element) {
                list.splice(list.indexOf(element), 1);
            });
            return list;
        },
        listTemplates: function() {
            return this.commands.list();
        },
        startPeriodicStateChange: function() {
            var self = this;
            var index = 0;
            this.commands.stopPeriodicStateChange();

            this._stateChangeInProgress = false;
            logger.info("Periodic state update enabled");

            function updateNext(id) {
                return new Promise(function(resolve, reject) {
                    setTimeout(function() {
                        if(self._resources[id]) {
                            try {
                                self._resources[id].commands.emit();
                            } catch(err) {
                                //Probably emit function is not defined, ignore it
                            }
                        }
                        resolve();
                    }, 500);
                }); 
            }

            function getNext() {
                // console.log(Object.keys(self._resources));
                return Object.keys(self._resources)[index++];
            }

            function start() {
                var id = getNext();
                // console.log('Updating id ' + id);
                if(id) {
                    updateNext(id).then(function() {
                        start();
                    }).catch(function(err) {
                        logger.error("Failed to update " + err);
                        console.log(err.stack);
                        self._stateChangeInProgress = false;
                    });
                } else {
                    logger.info('Periodic update complete');
                    self._stateChangeInProgress = false;
                }
            }

            this._stateChangeTimer = setInterval(function() {
                if(!self._stateChangeInProgress) {
                    self._stateChangeInProgress = true;
                    if(Object.keys(self._resources).length > 0) {
                        logger.info('Periodic update to virtual devices states in progress...');
                        index = 0;
                        start();
                    }
                } else {
                    logger.info('Previous periodic update in progress, skipping...');
                }
            }, 30000);

            return Promise.resolve('Started successfully');
        },
        stopPeriodicStateChange: function() {
            logger.info("Periodic state update disabled");
            clearInterval(this._stateChangeTimer);
            return Promise.resolve('Stopped successfully');
        },
        init: function() {
            var self = this;
            self._isInitializing = true;
            return new Promise(function(resolve, reject) {
                ddb.shared.get(VirtualConfigDbPrefix + 'idCounter').then(function(value) {
                    if(value === null || value.siblings.length === 0) {
                        self._id = 0;
                    } else {
                        value = JSON.parse(value.siblings[0]);
                        self._id = value;
                    }
                }).then(function() {
                    var nodes = {};
                    var p = [];
                    function next(err, result) {
                        if(err) {
                            return;
                        }

                        var prefix = result.prefix;
                        var id = result.key.substring(prefix.length);

                        var siblings = result.siblings;
                        if(siblings.length !== 0) {
                            try {
                                var resource;
                                try {
                                    resource = JSON.parse(siblings[0]);
                                } catch(err) {
                                    resource = siblings[0];
                                }
                                nodes[id] = resource;
                            } catch(e) {
                                logger.error("json parse failed with error- " + e);
                            }
                        } else {
                            logger.error("Key was deleted");
                        }
                    }
                    ddb.shared.getMatches(VirtualDeviceDbPrefix, next).then(function() {
                        Object.keys(nodes).forEach(function(id) {
                           if(typeof self._deviceCount[nodes[id]] === 'undefined') {
                                self._deviceCount[nodes[id]] = 0;
                           }
                           self._deviceCount[nodes[id]]++;
                           p.push(self.commands.start(nodes[id], id));
                        });
                        Promise.all(p).then(function() {
                            self._isInitializing = false;
                            resolve();
                        }, function(err) {
                            self._isInitializing = false;
                            logger.error('Failed to init device controllers ' + err + JSON.stringify(err));
                            reject(err);
                        });
                    }, function(err) {
                        self._isInitializing = false;
                        logger.error('Failed to get devices from database ' + err + JSON.stringify(err));
                        reject(err);
                    });
                });
            });
        }
    }
};

module.exports = dev$.resource('VirtualDeviceDriver', VirtualDeviceManager);