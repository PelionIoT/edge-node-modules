var Probe802154Radio = require('../index.js').Probe802154;
var config = require('./rp200-v2-config.json');
// var execSync = require('child_process').execSync;

function usage() {
    console.log('Usage- node test-radios.js [function] [module=M1 or M2]');
    console.log('Functions are: ');
    console.log('\tresetLow:\tPull down the reset gpio of cc2530 module');
    console.log('\tresetHigh:\tPull up the reset gpio of cc2530 module');
    console.log('\treboot:\t\tReboot cc2530 by pulling low and then high the reset gpio');
    console.log('\tverify:\t\tVerify if the software is written successfully');
    console.log('\tprogram:\tBurn firmware on cc2530');
    console.log('\ttransmit:\tTransmit 5 packets at channel 25');
    console.log('\treceive:\tReceive packets at channel 25');
    process.exit(1);
}

if(process.argv.length < 3 || process.argv[2].indexOf('-h') > -1) {
    usage();
}

var func = process.argv[2];
var mod = process.argv[3] || 'M1';

console.log('Going to perform function- ', func + ' on cc2530 module ' + mod);

var options = config[mod].options;
options.verbose = true;
var probeSlipRadio = new Probe802154Radio(options);

// execSync("kill `ps -ef | grep cc2530 | awk '{print $2}'`");
// execSync("kill `ps -ef | grep slipcomms | awk '{print $2}'`");

probeSlipRadio.setup802154GPIOs().then(function() {
    console.log('GPIO setup successfully!');
    if(func == 'resetLow') {
        console.log('Setting gpio low...');
        probeSlipRadio.resetLow();
    } else if(func == 'resetHigh') {
        console.log('Setting gpio high...');
        probeSlipRadio.resetHigh();
    } else if(func == 'reboot') {
        console.log('Resetting module...');
        probeSlipRadio.reset802154Radio();
    } else if(func == 'program') {
        console.log('Programming cc2530...');
        probeSlipRadio.burnSlipRadio().then(function() {
            console.log('Programmed successfully');
            probeSlipRadio.reset802154Radio();
        }, function(err) {
            console.error('Failed ', err);
        });
    } else if(func == 'verify') {
        console.log('Verifying program...');
        probeSlipRadio.test802154Radio().then(function() {
            console.log('Verified successfully');
        }, function(err) {
            console.log("Failed ", err);
        });
    } else if(func == 'transmit') {
        console.log('Transmitting packets...');
        probeSlipRadio.transmitPackets().then(function() {
            console.log('Transmitted successfully');
        }, function(err) {
            console.error('Failed ', err);
        });
    } else if(func == 'receive') {
        console.log('Receiving packets...');
        probeSlipRadio.receivePackets().then(function() {
            console.log('Received successfully');
        }, function(err) {
            console.error('Failed ', err);
        });
    } else {
        console.error('Function not found');
        usage();
    }
}, function(err) {
    console.error('Failed to setup gpios ', err);
});

//Change TX Power 
//  {  7, 0xFF },
  // {  5, 0xED },
  // {  3, 0xD5 },
  // {  1, 0xC5 },
  // {  0, 0xB6 },
  // { -1, 0xB0 },
  // { -3, 0xA1 },
  // { -5, 0x91 },
  // { -7, 0x88 },
  // { -9, 0x72 },
  // {-11, 0x62 },
  // {-13, 0x58 },
  // {-15, 0x42 },
  // {-24, 0x00 },