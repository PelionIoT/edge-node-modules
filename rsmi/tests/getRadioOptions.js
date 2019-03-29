var jsonminify = require('jsonminify');
var fs = require('fs');

var module = process.argv[2] || 'ww-zwave';

var radioProfile = JSON.parse(jsonminify(fs.readFileSync(__dirname + '/../example.radioProfile.config.json', 'utf8')));

var hwversion = radioProfile.hardwareVersion;
var radioConfig = radioProfile.radioConfig;
var map = radioProfile.configurations[hwversion][radioConfig][module] || [];
var radioOptions = map[0] ? Object.assign({}, radioProfile.pcb_map[hwversion][map[0]], radioProfile.modules[module][map[1]]) : undefined;

console.log('Starting module on radio options from radioProfile.config.json- ', radioOptions);