var Promise = require('es6-promise').Promise;

function cc2530TestModule(device, oRSSI_THRESHOLD, iRSSI_THRESHOLD, mac, unitindex, sixpath, ccProgrammer, ccHex, ccSlip, mode, version) {
	this.device = device;
	this.siodev = device;
	this.oRSSI_THRESHOLD = oRSSI_THRESHOLD;
	this.iRSSI_THRESHOLD = iRSSI_THRESHOLD;
	this.mac = mac;
	this.resultFileName = "factoryResult" + unitindex + ".json";
	this.unit = unitindex;
	this.ccProgrammer = ccProgrammer;
	this.programmer = ccProgrammer;
	this.ccSlip = ccSlip;
	this.testprog = ccSlip;
	this.ccHex = ccHex;
	this.firmware = ccHex;
	this.sixlowpanindex = sixpath;
	this.module = "802154"
	this.mode = mode; //client | server
	this.version = version;
}

cc2530TestModule.prototype.run802154radio = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		var Probe802154Radio = require(self.sixlowpanindex).Probe802154;

		//config params
		var config = {
			player: (self.mode == 'client' ? 'tx' : 'rx'),
			channel: 25,
			packets: 5,
			interval: 1000,
			macAddr: self.mac,
			resultFileName: self.resultFileName
		}
		probeSlipRadio = new Probe802154Radio(self);

		//radio specific params
		// config.macAddr = '00 a5 09 00 00 01 43 42'; //Randomize the mac
		// config.resultFileName = 'factoryResult1.json';

		probeSlipRadio.start({
			verify: false,
			verbose: true,
			forceBurn: true,
			factoryTest: true,
			factoryParams: config
		}).then(function() {
			console.log('Radio ' + self.unit + ' programmed and tested successfully');
			var result = require('../../' + self.resultFileName);
			console.log('Got result: ', result);
			Object.keys(result).forEach(function(packet) {
				if (result[packet][0] == 1) {
					if (result[packet][1] > self.oRSSI_THRESHOLD && result[packet][2] > self.iRSSI_THRESHOLD) {
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

	});
}

module.exports = cc2530TestModule;