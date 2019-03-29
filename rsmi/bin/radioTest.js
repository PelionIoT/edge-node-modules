//*******************************************************************************
//802154 
var oRSSI_THRESHOLD = 200;
var iRSSI_THRESHOLD = 200;

var fs = require("fs");
var radioTest = require('commander');

function run802154Radio() {
	return new Promise(function(resolve, reject) {
		var Probe802154Radio = require(__dirname + "/" + radioTest.sixlowpanpath).Probe802154;

		//config params
		var first = ;

		var randmac = '00 a5 09 00 00 ' + Math.floor(Math.random() * (255 - 0 + 1) + 0).toString(16) + " " + Math.floor(Math.random() * (255 - 0 + 1) + 0).toString(16) + " " + Math.floor(Math.random() * (255 - 0 + 1) + 0).toString(16);

		var config = {
			player: (radioTest.mode == 'client' ? 'tx' : 'rx'),
			channel: 25,
			macAddr: (radioTest.mode == 'server' ? '00 a5 09 00 00 39 bb 01' : randmac)
			packets: 5,
			interval: 1000,
			macAddr: '',
			resultFileName: ''
		}

		if (radioTest.tty == 'ttyS6') {
			probeSlipRadio1 = new Probe802154Radio(radioTest);

			//radio specific params
			//config.macAddr = '00 a5 09 00 00 01 43 42'; //Randomize the mac
			//config.macAddr = ''; //Randomize the mac
			config.resultFileName = 'factoryResult1.json';

			probeSlipRadio1.start({
				verify: false,
				verbose: true,
				forceBurn: true,
				factoryTest: true,
				factoryParams: config
			}).then(function() {
				console.log('Radio 1 programmed and tested successfully');
				var result = require('./' + config.resultFileName);
				console.log('Got result: ', result);
				Object.keys(result).forEach(function(packet) {
					if (result[packet][0] == 1) {
						if (result[packet][1] > oRSSI_THRESHOLD && result[packet][2] > iRSSI_THRESHOLD) {
							resolve();
						}
					}
					if (packet >= config.packets - 1) {
						reject(new Error('Could not clear RSSI threshold'));
					}
				});
			}, function(err) {
				console.error('Slip Radio start failed with error: ', err);
				reject(err);
			});
		}
		else if (radioTest.tty == 'ttyS4') {
			probeSlipRadio2 = new Probe802154Radio(radioTest);

			//radio specific params
			//config.macAddr = '00 a5 09 00 00 02 73 54';
			config.resultFileName = 'factoryResult2.json';

			probeSlipRadio2.start({
				verify: false,
				verbose: true,
				forceBurn: true,
				factoryTest: true,
				factoryParams: config
			}).then(function() {
				console.log('Radio 2 programmed and tested successfully');
				var result = require('./' + config.resultFileName);
				Object.keys(result).forEach(function(packet) {
					if (result[packet][0] == 1) {
						if (result[packet][1] > oRSSI_THRESHOLD && result[packet][2] > iRSSI_THRESHOLD) {
							resolve();
						}
					}
					if (packet >= config.packets - 1) {
						reject(new Error('Could not clear RSSI threshold'));
					}
				});
			}, function(err) {
				console.error('Slip Radio start failed with error: ', err);
				reject(err);
			});
		}
	});
}

//*******************************************************************************
//Zwave 
function runZwaveRadio(zpath) {
	return new Promise(function(resolve, reject) {
		var ProbeZwave = require(__dirname + "/" + radioTest.sixlowpanpath).ProbeZwave;
		var ZwaveController = require(zpath).ZwaveController;

		var zwaveHandler = new ZwaveController({
			siodev: '/dev/ttyS5',
			saveconfig: true,
			consoleoutput: false
		});

		var probeZwave = new ProbeZwave();
		var homeID = null;

		probeZwave.start({
			verify: false,
			verbose: true
		}).then(function() {
			console.log("Starting ZwaveController...");
			zwaveHandler.start().then(function(homeid) {
				console.log('ZwaveController started succesfully with homeid: ', homeid);
				homeID = homeid;
			}, function() {
				console.error('ZwaveController start failed');
				reject(new Error('ZwaveController start failed'));
			});

			console.log("Trying to connect to zwave module...");
			zwaveHandler.connect().then(function() {
				console.log("Connection with zwave module established succesfully");
			}, function() {
				console.log("Connection could not be established");
				reject(new Error('Connection could not be established'));
			});

			zwaveHandler.on('node ready', function(nodeid, nodeinfo) {
				// console.log('Node: ', nodeid + 'info: ', nodeinfo);
				console.log('Node complete: ', zwaveHandler.nodes[nodeid]);

				if (nodeid == 1) {
					if (homeID != null) {
						console.log('Zwave test complete.. ZM5304 working');
						resolve();
					}
					else {
						console.error('Zwave testing failed..');
						reject(new Error('Zwave testing failed..'));
					}
				}
			});
		}, function(err) {
			console.error('Zwave start failed with error: ', err);
			reject(err);
		});
	});
}

var radio = null;
var module = null;

function main() {
	if (process.argv.length > 2) {
		radio = process.argv[2];
		if (radio == '802154' && process.argv.length > 3) {
			module = process.argv[3];
			if (module != 'ttyS6' || module != 'ttyS4') {
				run802154Radio(module).then(function() {
					console.log('PASSED');
					process.exit(0);
				}, function(err) {
					console.log('FAILED');
					process.exit(0);
				});
			}
			else {
				console.error('Passed argument is not supported, specify which radio ex: ttyS6 or ttyS4');
				process.exit(1);
			}
		}
		else if (radio == 'zwave') {
			runZwaveRadio().then(function() {
				console.log('PASSED');
				process.exit(0);
			}, function(err) {
				console.log('FAILED');
				process.exit(0);
			});
		}
		else {
			console.error('Argument missing, specify which radio ex: zwave, 802154 ttyS6');
			process.exit(1);
		}
	}
	else {
		console.error('No argument specified, ex: node radioTest.js zwave, node radioTest.js 802154 ttyS6');
		process.exit(1);
	}

	setTimeout(function() {
		console.log('FAILED');
		process.exit(0);
	}, 80000);
}

function existsSync(filename) {
	try {
		fs.accessSync(filename);
		return true;
	}
	catch (ex) {
		console.log("flase " + ex + "(%s)", filename);
		return false;
	}
}

var tty = "";
var error = false;

radioTest
	.version('0.0.1')
	.option('-R --radio [test]', 'specify the radio under test [zwave|802154]', 'zwave')
	.option('-t --tty [port]', 'specify the tty port. (ttyS6 is assocated with test 1) (ttyS4 is associated with t2)', 'ttyS6')
	.option('-z --zwavepath [path]', 'specify the full path to the zwave Conroller', '/wigwag/devicejs-core-modules/node_modules/ww-node-openzwave/wigwag-test/ZwaveController.js')
	.option('-l --sixlowpanpath [path]', 'specify the relative (to radioTest.js) path to appropriate index.js file', '../index.js')
	.option('-c --ccProgrammer [path]', 'specify the relative (to index.js) path to the ccProgrammer', 'bin/cc2530prog-arm')
	.option('-x --ccHexfile [path]', 'specify the relative (to index.js) hex file for the ccRadio', 'bin/cc2530-slip-radioread-v1_4.hex')
	.option('-s --ccSlip [path]', 'specify the relative (to index.js) slip radio file for the ccRadio', 'bin/slipcomms-arm')
	.option('-m --mode [player]', 'specify the radio test player mode, by default its client [server|client]', 'client')
	.option('-M --module [type]', 'specify the radio module for 802154 radios [zigbee|802154]]', '802154')
	.parse(process.argv);

if (radioTest.radio == "zwave") {
	if (existsSync(radioTest.zwavepath)) {
		runZwaveRadio(radioTest.zwavepath).then(function() {
			console.log('PASSED');
			process.exit(0);
		}, function(err) {
			console.log('FAILED');
			process.exit(0);
		});
	}
}
else if (radioTest.radio == "802154") {
	if (radioTest.tty == "ttys4") {
		tty = "ttyS4";
	}
	else if (radioTest.tty == "ttys6") {
		tty = "ttyS4";

	}
	else if (radioTest.tty == "ttyS6" || radioTest.tty == "ttyS4") {
		tty = radioTest.tty;
	}
	else {
		console.log("must specify the correct tty port --tty [ttyS4|ttyS6]");
		error = false;
	}
	console.log("checking six");
	if (!existsSync(radioTest.sixlowpanpath)) {
		error = false;
	}
	console.log("checking CCprogram");
	if (!existsSync(radioTest.ccProgrammer)) {
		error = false;
	}
	console.log("checkhing hex");
	if (!existsSync(radioTest.ccHexfile)) {
		error = false;
	}
	console.log("acheck slip");
	if (!existsSync(radioTest.ccSlip)) {
		error = false;
	}
	if (error) {
		console.log("some help file now please");
	}
	else {
		radioTest.firmware = radioTest.ccHexfile;
		radioTest.programmer = radioTest.ccProgrammer;
		radioTest.testprog = radioTest.ccSlip;
		radioTest.siodev = radioTest.tty;
		run802154Radio(tty, radioTest.sixlowpanpath, radioTest.ccProgrammer, radioTest.ccHexfile).then(function() {
			console.log('PASSED');
			process.exit(0);
		}, function(err) {
			console.log('FAILED because: ' + err);
			process.exit(0);
		});
	}
}
else {
	console.log("must specify correct radio --radio [zwave|802154]");
}