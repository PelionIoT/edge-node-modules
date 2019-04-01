'use strict'
var path = require('path')

// const argv = require('optimist').argv
// const path = require('path')
// const devicejs = require('../core/httpPeer')
// const devicedb = require('./devicedb')
// const defaults = require('./defaults.json')
// const jsonminify = require('jsonminify')
// const logging = require('../core/logging')
// const config = require('./config')


var DBG_OFF = function(){}

var DBG_ON = function() {
	arguments[0] = "maestroRunner:devjs-runtime-tools2: " + arguments[0];
	console.log.apply(console,arguments);
};

var DBG = DBG_OFF;


var start_devjs_client = function(rootdir,configFile,extra) {

	if(extra && extra.debug) {
		DBG = DBG_ON;
	}

	DBG("in start_devjs_client()")

	var base = path.join(rootdir,'src/runtime');

	var devicejs = require(path.join(base,'../core/httpPeer'));
	var devicedb = require(path.join(base,'/devicedb'));
	var defaults = require(path.join(base,'/defaults.json'));
	var jsonminify = require('jsonminify')
	//const logging = require('../core/logging')
	var config = require(path.join(base,'/config'));

	let djsconfig

	DBG("start_devjs_client() step 2 (configFile:",configFile,")")

	try {
	    // if(typeof argv.config === 'string') {
	    //     djsconfig = config.loadConfigFromFile()
	    // }
	    // else {
	        djsconfig = config.loadConfigFromFile(configFile)
	    // }
	}
	catch(error) {
		return Promise.reject(error);
	    // console.error(error.message)
	    // process.exit(1)
	}

//	console.log("DJS TWO",djsconfig);

	let corePeer = new devicejs.DeviceJSPeer(djsconfig.uri, djsconfig)
	let ddb = devicedb(djsconfig.databaseConfig)

	DBG("start_devjs_client() step 3")

	return corePeer.connect().then(function() {
//	    var modulePath = path.resolve(process.cwd(), argv._[0])

	    global.dev$ = corePeer
	    global.devicejs = devicejs.DeviceJSPeer
	    global.ddb = global.devicedb = ddb
		global.modules = require(path.join(base,'./module'))(corePeer)
	    // global.log = logging('module')
	DBG("start_devjs_client() step 4")
	    // if(typeof argv._[0] !== 'string') {
	    //     throw 'No valid script specified'
	    // }
	    return true;
//	    return global.modules.load(modulePath)
	})
}

module.exports = {
	start_devjs_client: start_devjs_client
}