var ZwaveController = require('/wigwag/devicejs-core-modules/node_modules/ww-node-openzwave/wigwag-test/ZwaveController').ZwaveController;
var ProbeZwave = require(__dirname + '/../index.js').ProbeZwave;

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
		process.exit(1);
	});

	console.log("Trying to connect to zwave module...");
	zwaveHandler.connect().then(function() {
		console.log("Connection with zwave module established succesfully");
	}, function() {
		console.log("Connection could not be established");
		process.exit(1);
	});

	zwaveHandler.on('node ready', function(nodeid, nodeinfo) {
		// console.log('Node: ', nodeid + 'info: ', nodeinfo);
		console.log('Node complete: ', zwaveHandler.nodes[nodeid]);

		if (nodeid == 1) {
			if (homeID != null) {
				console.log('Zwave test complete.. ZM5304 working');
				process.exit(0);
			}
			else {
				console.error('Zwave testing failed..');
				process.exit(1);
			}
		}
	});
}, function(err) {
	console.error('Zwave start failed with error: ', err);
	process.exit(1);	
})
