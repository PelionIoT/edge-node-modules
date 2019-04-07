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