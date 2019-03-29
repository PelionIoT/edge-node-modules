var Promise = require('es6-promise').Promise;

function zWaveTestModule(device, saveconfig, consoleoutput, index) {
	this.device = device;
	this.saveconfig = saveconfig;
	this.consoleoutput = consoleoutput;
	this.indexfile = index;
}

zWaveTestModule.prototype.runZwaveRadio = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		var ProbeZwave = require(self.indexfile).ProbeZwave;
		var ZwaveController = require('ww-node-openzwave/wigwag-test/ZwaveController').ZwaveController;

		var zwaveHandler = new ZwaveController({
			siodev: self.device,
			saveconfig: self.saveconfig,
			consoleoutput: self.consoleoutput
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
		})
	});
}

module.exports = zWaveTestModule;