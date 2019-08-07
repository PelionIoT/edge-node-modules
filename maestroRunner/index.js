'strict mode'
/*
 * Copyright (c) 2018, Arm Limited and affiliates.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var util = require('util');
var path = require('path');
var fs = require('fs');
var common = require('./common-funcs.js');

var stdin = process.stdin;


var ERROR_OUT = function(){
    arguments[0] = "maestroRunner: " + arguments[0];
    console.error.apply(console,arguments);
}

var ERROR_OUT_JSERR = function(msg,err) {
    var s = "maestroRunner: " + msg;
    var s2 = "";
    if(err.stack) {
        s2 = err.stack
    }
    console.error.call(console,s,err,s2)
}

var DBG_ON = function(){
    arguments[0] = "maestroRunner: " + arguments[0];
    console.log.apply(console,arguments);
}

var DBG_OFF = function(){}

var DBG = DBG_ON;

DBG("Pre-logger setup")

var GREASE_ORIGIN_ID = undefined;

if (process.env.GREASE_ORIGIN_ID) {
    var n = parseInt(process.env.GREASE_ORIGIN_ID);
    if (n) {
        GREASE_ORIGIN_ID = n;
    }
}

var moment = require('moment');
var globallog = log = require('./globallogger')({client_only:true, always_use_origin: false, default_origin: GREASE_ORIGIN_ID
    , verbose: 2  // debug?
});

if (GREASE_ORIGIN_ID) {
    // Make all log calls use the assigned Origin ID if one is provided
    log.setGlobalOpts({
        defaultOriginId: GREASE_ORIGIN_ID
    });
    DBG("set defaultOriginId to",GREASE_ORIGIN_ID)
} else {
    ERROR_OUT("No GREASE_ORIGIN_ID env provided. Logging will not show correct origin.");
}

global.log = log;

var run_tools2 = require('./devjs-runtime-tools2.js');

var DEFAULT_SERVER_ADDRESS = '127.0.0.1';
var DEFAULT_LOCAL_SERVER_PORT = 23242;   // updated in devicejs 2.0 when we went to peer SSL
var DEFAULT_DB_PORT = 9000;

// var DUMMY_API_KEY = 'abc123';
// var DUMMY_API_SECRET = 'myAPISecret';

var databasePort = null;
var serverPort = null;
var serverAddress = null;


DBG_ON("TEST")
/**
 * 
 * This file is equivlent to [devicejs-ng]/src/runtime/run.js
 */


function addModuleSchemas(moduleDirectory, dev$) {
    var moduleInfoPath = path.resolve(moduleDirectory, 'devicejs.json');

    return new Promise(function(resolve, reject) {
        try {
            var devicejsModuleInfo = require(moduleInfoPath);
            resolve(devicejsModuleInfo);
        }
        catch(error) {
            reject(error);
        }
    }).then(function(devicejsModuleInfo) {
            var interfaces = devicejsModuleInfo.interfaces;
            var resourceTypes = devicejsModuleInfo.resourceTypes;
            var promises = [ ];

            if(interfaces instanceof Array) {
                // load interface types into core
                interfaces.forEach(function(interfaceFile) {
                    if(typeof interfaceFile === 'string') {
                        promises.push(readJSONFile(path.resolve(process.cwd(), moduleDirectory, interfaceFile)).then(function(interfaceType) {
                            return dev$.addInterfaceType(interfaceType);
                        }));
                    }
                });
            }

            if(resourceTypes instanceof Array) {
                // load resource types into core
                resourceTypes.forEach(function(resourceTypeFile) {
                    if(typeof resourceTypeFile === 'string') {
                        promises.push(readJSONFile(path.resolve(process.cwd(), moduleDirectory, resourceTypeFile)).then(function(resourceType) {
                            return dev$.addResourceType(resourceType);
                        }));
                    }
                });
            }

            return Promise.all(promises);
        });
}

/*
 * Borrowed from devicedb-distributed/bin/devicedbd.js
 * with some extra error handling thrown in
 */
function fillInHTTPS(httpsOptions, txt) {
    if(!httpsOptions) {
        throw "No https options";
//        return;
    }
    
    if(util.isArray(httpsOptions.ca)) {
        for(var i = 0; i < httpsOptions.ca.length; i += 1) {
            httpsOptions.ca[i] = fs.readFileSync(httpsOptions.ca[i], 'utf8');
//            httpsOptions.ca[i] = fs.readFileSync(path.resolve(configDir, httpsOptions.ca[i]), 'utf8');            
        }
    } else {
        throw "start-modules.js could not read "+txt+" CA file!! @"+httpsOptions.ca[i];
    }
    
    if(httpsOptions.key) {
        httpsOptions.key = fs.readFileSync(httpsOptions.key, 'utf8');
//        httpsOptions.key = fs.readFileSync(path.resolve(configDir, httpsOptions.key), 'utf8');
    } else {
        throw "start-modules.js could not read "+txt+" .key file file!! @" + httpsOptions.key;
    }
    
    if(httpsOptions.cert) {
        httpsOptions.cert = fs.readFileSync(httpsOptions.cert, 'utf8');
        // httpsOptions.cert = fs.readFileSync(path.resolve(configDir, httpsOptions.cert), 'utf8');
    } else {
        throw "start-modules.js could not read "+txt+" .cert file file!! @" + httpsOptions.cert;
    }
}



var startModules = function (devjsroot,config,devjs_config_file,opts) {
    if(!opts) {
        opts = {};
    }

    if(opts.debug) {
        DBG = DBG_ON;
    }

    DBG("start-modules #3.1")
    if(opts && typeof opts !== 'object') {
        throw "Bad parameters to startModules()";
    }

    var extra = { debug: opts.debug };
 
    if(typeof config !== 'object' || typeof devjs_config_file !== 'string') {
        throw "Bad configuration passed into startModules()";
    }

    run_tools2.start_devjs_client(devjsroot,devjs_config_file,extra)
    .then(function(clients) {
        DBG("start-modules #3.3")
        // global.dev$ = clients.dev$;
        // global.devicejs = clients.devicejs;
        // global.ddb = global.devicedb = clients.ddb;
        // global.Promise = Promise;
        // global.modules = require(path.join(devjsroot, 'src/runtime/module'))(clients.dev$);
        global.log = globallog;
        log.success("CONNECTED",config);

        var returned_promises = [];
        var failures = 0;

        if(typeof config.maestro_user_socket_path === 'string') {
            global.MAESTRO_UNIX_SOCKET = config.maestro_user_socket_path
        } else {
            console.error("Do not have a UNIX SOCKET path to maestro")
        }

        if(typeof config.process_config === 'string') {
            global.MAESTRO_PROCESS_CONFIG = config.process_config
        }

        global.MAESTRO_CONFIG_NAMES = {} // this is a map of Job name to config name

	var modnames = [];
	if(config.moduleconfigs) {
            modnames = Object.keys(config.moduleconfigs)
	}
	
        for(var n=0;n<modnames.length;n++) {
            var name = modnames[n]
            var modconf = config.moduleconfigs[name]
            log.debug("config.moduleconfigs["+name+"] = " + util.inspect(modconf));
            if(typeof modconf === 'object' && 
                typeof modconf.exec_cmd === 'string') {

                if(modconf.config_name && typeof modconf.config_name === 'string' && modconf.config_name.length > 0) {
                    global.MAESTRO_CONFIG_NAMES[name] = modconf.config_name;
                }

                var modulePath = path.resolve(modconf.exec_cmd);

                (function(_path,_config){
                    returned_promises.push(modules.load(_path)
                            .then(function() {
                                log.success("Loaded module: " + _path + " successfully");
// FIXME - we need to add support for this in the 
// maestro API - we almost have it already
//                                process.send({ module: { name: _config._devjsModName, status: "ok"}});
                            }).catch(function(e){
                                log.error("Failed to load module: " + _path);
                                if(e) {
                                    log.error("Details of failure:",e);
                                    if(e.stack) {
                                        log.error(e.stack);
                                    }
                                }
// FIXME - we need to add support for this in the 
//                                process.send({ module: { name: _config._devjsModName, status: e}});
                                failures++;
                            })
                    );
                })(modulePath,config.moduleconfigs[name]);
            } else {
                log.error("Bad module entry. No job.exec_cmd. deviceJS module:",name);
            }
        }

        Promise.all(returned_promises).then(function() {
            if(config.exit_any_failure && failures > 0) {
                log.error("process group saw",failures,"failures. Managed exit() now.");
                log.error('[RUN]','Startup failed ');
//                process.send({ status: 'start failed' });
                process.exit(2);
            }

            if(config.force_restart) {
                log.debug("Restart process in",config.force_restart,"ms");
                setTimeout(function(){
                    log.info("** Controlled exit of process after restart timeout (force_restart) **");
                    process.exit(0);
                },config.force_restart);
            }

            process.on('uncaughtException', function(err) {
                if(err.stack) {
                    log.error("uncaughtException: " + err.stack);
                } else {
                    log.error("uncaughtException: " + util.inspect(err));
                }
                throw err;
            });
            log.log('[RUN]','Started!');
//            process.send({ status: 'start successful' });
        }).catch(function(error){
            log.error('[RUN]','Startup failed: ', error);
//            process.send({ status: 'start failed' });
            process.exit(1);
        });


    }, function(error) {
        ERROR_OUT_JSERR('[RUN] Error connecting to server', error);
//        process.send({ status: 'start failed' });
        process.exit(1);
    }).catch(function(e){
        ERROR_OUT_JSERR("[RUN] @catch create_devjs_clients:",e);
        process.exit(1);
    });
};


var pq = 0
setInterval(function(){
    if(global.log) {
        log.debug("maestroRunner - running. [",pq,"] (20s interval)")
    } else {
        console.error("No global log",pq)
    }
    pq++
},20000)



// if(typeof process.env.DEVJS_CONFIG_FILE !== 'string') {
//     console.error("Badly formed passed in config: " + process.env.DEVJS_CONFIG_FILE);
//     process.exit(1);    
// }

// try {
//     var devJSConfig = JSON.parse(process.env.DEVJS_CONFIG_FILE);
// } catch(e) {
//     console.error("Badly formed passed in config: " + process.env.DEVJS_CONFIG_FILE);
//     process.exit(1);
// }

var readStdin = function() {
    return new Promise(function(resolve) {
        var ret = "";

        if (stdin.isTTY) {
            resolve(ret);
            return;
        }

        stdin.setEncoding('utf8');

        stdin.on('readable', function() {
            var chunk;

            while ((chunk = stdin.read())) {
                ret += chunk;
            }
        });

        stdin.on('end', function(){
            resolve(ret);
        });
    });    
}



// databasePort = (devJSConfig.databaseConfig && typeof devJSConfig.databaseConfig.port == 'number') ? devJSConfig.databaseConfig.port : DEFAULT_DB_PORT;
// serverPort = (devJSConfig.localPort !== undefined) ? devJSConfig.localPort : DEFAULT_LOCAL_SERVER_PORT;
// serverAddress = (devJSConfig.serverAddress !== undefined) ? devJSConfig.serverAddress : DEFAULT_SERVER_ADDRESS;
DBG("start-modules #1")

var subVars = {};

// && process.env.DEVJS_MODULE_CONFIG && process.env.DEVJS_CONFIG_FILE


if(process.env.RUNNER_SUBST) {
    var subs = process.env.RUNNER_SUBST.split(',');
    for(var n=0;n<subs.length;n++) {
        var val = subs[n].split(":");
        if(val[0].length > 0 && val[1].length > 0) {
            subVars[val[0]] = val[1];
        }
    }
}

subVars['thisdir'] = __dirname;

if(process.env.DEVJS_ROOT && process.env.DEVJS_CONFIG_FILE) {

    if(process.env.DEBUG_MAESTRO_RUNNER) {
        DBG = DBG_ON;
    }

    var DEVJS_ROOT = common.resolveVarsPath(process.env.DEVJS_ROOT,subVars);
    var DEVJS_CONFIG_FILE = common.resolveVarsPath(process.env.DEVJS_CONFIG_FILE,subVars);

    readStdin().then(function(data){
        if(data) {
            DBG("start-modules #2:",DEVJS_ROOT,DEVJS_CONFIG_FILE);
            common.minifyJSONParseAndSubstVars(data,function(err,config){

                if(err) {
                    ERROR_OUT('Badly formed configuration passed in. Parse of config failed:', util.inspect(err));
                    process.exit(1);                    
                }                

                log.info("maestroRunner moduleconfigs:",config)

                var runModules = function() {
                    DBG("start-modules #3 - runModules()")
                    if(config) {
                        log.info("Doing start_modules...");
                        try {
                            var opts = {};
                            if(config && typeof config.process_config == 'object')
                                opts = config.process_config;
                            DBG("  startModules() opts is:",opts);
                            if(process.env.DEBUG_MAESTRO_RUNNER) {
                                opts.debug = true;
                            }
                            startModules(DEVJS_ROOT, config, DEVJS_CONFIG_FILE, opts);
                        } catch(e) {
                            ERROR_OUT("Failed to start modules. Error:",e);
                            process.exit(2);
                        }
                        log.debug("start-modules #4")
                    } else {
                        ERROR_OUT("No usable config provided to maestroRunner:");
                        process.exit(1);
                    }

                }


                if(config.process_config && typeof config.process_config == 'string') {
                    common.minifyJSONParse(config.process_config,function(err,innerconfig){
                        if(err) {
                            log.warn("Warning - config.process_config could not be parsed as JSON. Error:",err)
                        } else {
                            config.process_config = innerconfig;
                            setImmediate(function(){
                                runModules()
                            });
                        }
                    })
                } else {
                    log.warn("Warning - config.process_config not provided - or not a string")
                    runModules();
                }

            },subVars);
        } else {
            ERROR_OUT("No stdout provided")
        }
    })

//    console.dir(process.env);

} else {
    ERROR_OUT("Error: Missing critical env vars.");
    log.error("Error: Missing critical env vars.");
    process.exit(1);
}
