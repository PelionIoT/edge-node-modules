var Promise = require('es6-promise').Promise;
var jsonminify = require('jsonminify');
var fs = require('fs');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

//**********************************************************************************************************
//**********************************************************************************************************
//********** 802154 Radio RSMI *******************
//**********************************************************************************************************
//**********************************************************************************************************
var Probe802154 = exports.Probe802154 = function(options) {
    // console.log("someone called me and i like %s", options.siodev);
    
    console.log('Got options ', options);
    this.verify = false;
    this.verbose = options.verbose || false;
    this.forceBurn = false;
    this.factoryTest = false;
    this.test802154Radio_interval = null;
    this.numoftesttrials = 3;
    this.slipcomms_child = null;
    this.factory_child = null;
    this.cc2530prog_child = null;
    this.handshake802154Radio_timeout = null;

    this.module = options.module;
    if (options.siodev.indexOf('ttyS') === 0) {
        this.siodev = '/dev/' + options.siodev;
    }
    else {
        this.siodev = options.siodev;
    }
    this.cc2530Programmer = options.programmer;
    this.cc2530Hex = options.firmware;
    this.cc2530TestProg = options.testprog;
    this.version = options.version;
    this.gpios = options.gpios;

    // console.log("the new stuff: %s %s %s %s %s %s", this.module, this.siodev, this.cc2530Programmer, this.cc2530Hex, this.cc2530TestProg, this.version);
};

Probe802154.prototype.start = function(options) {
    var self = this;
    self.verbose = self.verbose || options.verbose;
    self.verify = self.verify || options.verify;
    self.forceBurn = self.forceBurn || options.forceBurn; //if forceBurn then skip handshaking process
    self.factoryTest = self.factoryTest || options.factoryTest;
    var factoryParams = options.factoryParams;

    var siodev = self.siodev;
    return new Promise(function(resolve, reject) {
        self.setup802154GPIOs().then(function() {
            console.log(siodev + ': 802154 gpio setup successful');

            setTimeout(function() {
                self.handshake802154Radio().then(function() {
                    clearTimeout(self.handshake802154Radio_timeout);
                    console.log(siodev + ': Slip radio handshake successful, skipping firmware overwrite...');

                    if (self.factoryTest) {
                        if (self.factory_child) {
                            self.factory_child.kill();
                        }

                        self.factoryTest802154Range(factoryParams).then(function() {
                            console.log(siodev + ': Factory test finished successfully');
                            self.setup802154GPIOs().then(function() {
                                resolve();
                            });
                        }, function(err) {
                            console.error(siodev + ': Factory test failed with error ', err);
                            reject(err);
                        });
                    }
                    else {
                        self.setup802154GPIOs().then(function() {
                            resolve();
                        });
                    }
                }, function(err) {
                    console.error(siodev + ': Handshake failed: ', err);
                    console.log(siodev + ': Burning new firmware... ');
                    self.burnSlipRadio().then(function() {
                        console.log(siodev + ': Burn successful');
                        self.slipcomms_child = 0;

                        if (self.verify) {
                            self.test802154Radio_interval = setInterval(function() {
                                if (self.slipcomms_child) {
                                    self.slipcomms_child.kill();
                                }

                                if (self.numoftesttrials-- > 0) {
                                    self.test802154Radio().then(function() {
                                        console.log(siodev + ': New image test successful');
                                        clearInterval(self.test802154Radio_interval);
                                        self.setup802154GPIOs().then(function() {
                                            resolve();
                                        });
                                    }, function(err) {
                                        console.error(siodev + ': Testing new image failed');
                                        clearInterval(self.test802154Radio_interval);
                                        reject(err);
                                    });
                                }
                                else {
                                    console.log(siodev + ': Testing new image timed out.. slipradio not responding');
                                    clearInterval(self.test802154Radio_interval);
                                    reject(new Error('Testing new image timed out.. slipradio not responding'));
                                }
                            }, 2000);
                        }
                        else if (self.factoryTest) {
                            if (self.factory_child) {
                                self.factory_child.kill();
                            }
                            self.setup802154GPIOs().then(function() {
                                self.factoryTest802154Range(factoryParams).then(function() {
                                    console.log(siodev + ': Factory test finished successfully');
                                    self.setup802154GPIOs().then(function() {
                                        resolve();
                                    });
                                }, function(err) {
                                    console.error(siodev + ': Factory test failed with error ', err);
                                    reject(err);
                                });
                            });
                        }
                        else {
                            self.setup802154GPIOs().then(function() {
                                resolve();
                            });
                        }
                    }, function(err) {
                        console.error(siodev + ': Slip Radio burn failed');
                        reject(err);
                    });
                });
            }, 1000);
        }, function(err) {
            reject(err);
        });
    });
};

Probe802154.prototype.handshake802154Radio = function() {
    //Do not delete this: For simulation
    // return new Promise(function(resolve, reject) {
    //  reject();
    // });
    var self = this;
    if (!self.forceBurn) {
        self.handshake802154Radio_timeout = setTimeout(function() {
            console.error(self.siodev + ': Handshake timed out');
            if(self.slipcomms_child)
                self.slipcomms_child.kill();
        }, 30000);
        return self.test802154Radio();
    }
    else {
        return new Promise(function(resolve, reject) {
            reject(new Error('force burn enabled'));
        });
    }
};

Probe802154.prototype.resetLow = function() {
    console.log('Turning gpio ' + this.gpios.reset + ' to low');
    execSync('echo 0 > /sys/class/gpio/gpio' + this.gpios.reset + '/value');
};

Probe802154.prototype.resetHigh = function() {
    execSync('echo 1 > /sys/class/gpio/gpio' + this.gpios.reset + '/value');
    console.log('Turning gpio ' + this.gpios.reset + ' to high');
};

Probe802154.prototype.reset802154Radio = function() {
    execSync('echo out > /sys/class/gpio/gpio' + this.gpios.reset + '/direction');
    this.resetLow();
    this.resetHigh();
};

Probe802154.prototype.setup802154GPIOs = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        //Clk
        exec('echo ' + self.gpios.clock + ' > /sys/class/gpio/export', function(error, stdout, stderr) {
            try {
                execSync('echo out > /sys/class/gpio/gpio' + self.gpios.clock + '/direction');
            }
            catch (err) {
                console.error('command failed: echo out > /sys/class/gpio/gpio' + self.gpios.clock + '/direction');
                reject(err);
            }
            //Data 
            exec('echo ' + self.gpios.data + ' > /sys/class/gpio/export', function(error, stdout, stderr) {
                try {
                    execSync('echo out > /sys/class/gpio/gpio' + self.gpios.data + '/direction');
                }
                catch (err) {
                    console.error('command failed: echo out > /sys/class/gpio/gpio' + self.gpios.data + '/direction');
                    reject(err);
                }
                //Reset 
                exec('echo ' + self.gpios.reset + ' > /sys/class/gpio/export', function(error, stdout, stderr) {
                    try {
                        execSync('echo out > /sys/class/gpio/gpio' + self.gpios.reset + '/direction');
                        execSync('echo 1 > /sys/class/gpio/gpio' + self.gpios.reset + '/value');
                        resolve();
                    }
                    catch (err) {
                        console.error('command failed: echo out > /sys/class/gpio/gpio' + self.gpios.reset + '/direction');
                        reject(err);
                    }
                });
            });
        });
    });
};

Probe802154.prototype.test802154Radio = function() {
    var self = this;
    var test_command;
    if (self.module.indexOf('zigbee') > -1) {
        test_command = 'node ' + __dirname + "/" + self.cc2530TestProg;
    }
    else {
        test_command = __dirname + "/" + self.cc2530TestProg + ' -v -d ' + self.siodev + ' -B 115200 -t 12 -t 34 -t ' + self.version.slice(0, 1) + ' -t ' + self.version.slice(2, 3); //-t first two bytes can be random data, last two slip verion HB & LB
    }
    return new Promise(function(resolve, reject) {
        console.log(self.siodev + ': Testing 802154 radio');
        self.slipcomms_child = exec(test_command, function(error, stdout, stderr) {
            if (error !== null) {
                reject(error);
            }
            else {
                resolve();
            }
        });
        if (self.verbose) {
            var stdout = '';
            var stderr = '';
            self.slipcomms_child.stdout.on('data', function(buf) {
                console.log('[STR] stdout "%s"', String(buf));
                stdout += buf;
            });
            self.slipcomms_child.stderr.on('data', function(buf) {
                console.log('[STR] stderr "%s"', String(buf));
                stderr += buf;
            });
            self.slipcomms_child.on('close', function(code) {
                console.log('[END] code', code);
                console.log('[END] stdout "%s"', stdout);
                console.log('[END] stderr "%s"', stderr);
            });
        }
    });
};

Probe802154.prototype.transmitPackets = function() {
    var self = this;
    var test_command;
    if (self.module.indexOf('zigbee') > -1) {
        test_command = 'node ' + __dirname + "/" + self.cc2530TestProg;
    }
    else {
        //./slipcomms -v -d /dev/ttyS4 -B 115200 -m 00 a5 09 00 00 10 43 43 -f tx radioTX1.json 25 5 1000
        test_command = __dirname + "/" + self.cc2530TestProg + ' -v -d ' + self.siodev + ' -B 115200 -m 00 a5 09 00 00 10 43 43 -f tx radioTX1.json 25 5 1000';
    }
    return new Promise(function(resolve, reject) {
        console.log(self.siodev + ': Testing 802154 radio');
        self.slipcomms_child = exec(test_command, function(error, stdout, stderr) {
            if (error !== null) {
                reject(error);
            }
            else {
                resolve();
            }
        });
        if (self.verbose) {
            var stdout = '';
            var stderr = '';
            self.slipcomms_child.stdout.on('data', function(buf) {
                console.log('[STR] stdout "%s"', String(buf));
                stdout += buf;
            });
            self.slipcomms_child.stderr.on('data', function(buf) {
                console.log('[STR] stderr "%s"', String(buf));
                stderr += buf;
            });
            self.slipcomms_child.on('close', function(code) {
                console.log('[END] code', code);
                console.log('[END] stdout "%s"', stdout);
                console.log('[END] stderr "%s"', stderr);
            });
        }
    });
};

Probe802154.prototype.receivePackets = function() {
    var self = this;
    var test_command;
    if (self.module.indexOf('zigbee') > -1) {
        test_command = 'node ' + __dirname + "/" + self.cc2530TestProg;
    }
    else {
        //./slipcomms -v -d /dev/ttyS6 -B 115200 -f rx radioRX.json 25 2 10
        test_command = __dirname + "/" + self.cc2530TestProg + ' -v -d ' + self.siodev + ' -B 115200 -m 00 a5 09 00 00 39 bb 01 -f rx radioRX1.json 25 2 10';
    }
    return new Promise(function(resolve, reject) {
        console.log(self.siodev + ': Testing 802154 radio');
        self.slipcomms_child = exec(test_command, function(error, stdout, stderr) {
            if (error !== null) {
                reject(error);
            }
            else {
                resolve();
            }
        });
        if (self.verbose) {
            var stdout = '';
            var stderr = '';
            self.slipcomms_child.stdout.on('data', function(buf) {
                console.log('[STR] stdout "%s"', String(buf));
                stdout += buf;
            });
            self.slipcomms_child.stderr.on('data', function(buf) {
                console.log('[STR] stderr "%s"', String(buf));
                stderr += buf;
            });
            self.slipcomms_child.on('close', function(code) {
                console.log('[END] code', code);
                console.log('[END] stdout "%s"', stdout);
                console.log('[END] stderr "%s"', stderr);
            });
        }
    });
};

Probe802154.prototype.factoryTest802154Range = function(params) {
    var self = this;
    var test_command;

    test_command = __dirname + "/" + self.cc2530TestProg + ' -v -d ' + self.siodev + ' -B 115200 -m ' + params.macAddr + ' -f ' + params.player + ' ' + params.resultFileName + ' ' + params.channel + ' ' + params.packets + ' ' + params.interval;

    return new Promise(function(resolve, reject) {
        console.log(self.siodev + ': Factory Testing 802154 radio');
        self.factory_child = exec(test_command, function(error, stdout, stderr) {
            if (error !== null) {
                reject(error);
            }
            else {
                resolve();
            }
        });
        if (self.verbose) {
            var stdout = '';
            var stderr = '';
            self.factory_child.stdout.on('data', function(buf) {
                console.log('[STR] stdout "%s"', String(buf));
                stdout += buf;
            });
            self.factory_child.stderr.on('data', function(buf) {
                console.log('[STR] stderr "%s"', String(buf));
                stderr += buf;
            });
            self.factory_child.on('close', function(code) {
                console.log('[END] code', code);
                console.log('[END] stdout "%s"', stdout);
                console.log('[END] stderr "%s"', stderr);
            });
        }
    });
};

Probe802154.prototype.burnSlipRadio = function() {
    var self = this;
    var prog_command = __dirname + "/" + self.cc2530Programmer + ' -v -P -f ' + __dirname + "/" + self.cc2530Hex + ' -s 7 -e ' + self.gpios.reset + ' -d ' + self.gpios.data + ' -k '+ self.gpios.clock;
    console.log(self.siodev + ': Executing- ', prog_command);
    return new Promise(function(resolve, reject) {
        self.cc2530prog_child = exec(prog_command, function(error, stdout, stderr) {
            if (error !== null) {
                reject(error);
            }
            else {
                if (stderr) {
                    reject(stderr);
                }
                else {
                    resolve();
                }
            }
        });
        if (self.verbose) {
            var stdout = '';
            var stderr = '';
            self.cc2530prog_child.stdout.on('data', function(buf) {
                console.log('[STR] stdout "%s"', String(buf));
                stdout += buf;
            });
            self.cc2530prog_child.stderr.on('data', function(buf) {
                console.log('[STR] stderr "%s"', String(buf));
                stderr += buf;
            });
            self.cc2530prog_child.on('close', function(code) {
                console.log('[END] code', code);
                console.log('[END] stdout "%s"', stdout);
                console.log('[END] stderr "%s"', stderr);
            });
        }
    });
};
//**********************************************************************************************************
//**********************************************************************************************************

//**********************************************************************************************************
//**********************************************************************************************************
//********** Zwave Radio RSMI *******************
//**********************************************************************************************************
//**********************************************************************************************************
var ProbeZwave = exports.ProbeZwave = function(options) {
    this.zwavetest_child = null;
    this.handshakeZwaveRadio_timeout = 0;
    this.verbose = false;
    this.verify = false;
    this.gpios = options.gpios || undefined;
};

ProbeZwave.prototype.start = function(options) {
    var self = this;
    self.verify = options.verify;
    self.verbose = options.verbose;
    console.log('Starting zwave module firmware probe');
    return new Promise(function(resolve, reject) {
        self.setupZwaveGPIOs().then(function() {
            console.log('Zwave gpio setup successful');
            if (self.verify) {
                setTimeout(function() {
                    self.testZwaveRadio().then(function() {
                        console.log('Zwave module test successful');
                        clearTimeout(self.handshakeZwaveRadio_timeout);
                        resolve();
                    }, function(err) {
                        console.error('Zwave test failed with error: ', err);
                        reject(err);
                    });

                    self.handshakeZwaveRadio_timeout = setTimeout(function() {
                        if (self.zwavetest_child) {
                            console.error('Zwave handshake timed out, test failed...');
                            self.zwavetest_child.kill();
                            reject(new Error('Zwave handshake timed out, test failed...'));
                        }
                    }, 15000);
                }, 1000);
            }
            else {
                resolve();
            }
        }, function(err) {
            reject(err);
        });
    });
};

ProbeZwave.prototype.testZwaveRadio = function() {
    var self = this;
    console.log('Testing zwave module');
    return new Promise(function(resolve, reject) {
        self.zwavetest_child = exec('node ./bin/zwave-test.js', function(error, stdout, stderr) {
            if (error !== null) {
                reject(error);
            }
            else {
                resolve();
            }
        });
        if (self.verbose) {
            var stdout = '';
            var stderr = '';
            self.zwavetest_child.stdout.on('data', function(buf) {
                console.log('[STR] stdout "%s"', String(buf));
                stdout += buf;
            });
            self.zwavetest_child.stderr.on('data', function(buf) {
                console.log('[STR] stderr "%s"', String(buf));
                stderr += buf;
            });
            self.zwavetest_child.on('close', function(code) {
                console.log('[END] code', code);
                console.log('[END] stdout "%s"', stdout);
                console.log('[END] stderr "%s"', stderr);
            });
        }
    });
};

ProbeZwave.prototype.resetZwaveRadio = function() {
    var self = this;
    if(typeof self.gpios !== 'undefined') {
        execSync('echo out > /sys/class/gpio/gpio' + self.gpios.reset + '/direction');
        execSync('echo 0 > /sys/class/gpio/gpio' + self.gpios.reset + '/value');
        execSync('echo 1 > /sys/class/gpio/gpio' + self.gpios.reset + '/value');
    }
};

ProbeZwave.prototype.setupZwaveGPIOs = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(typeof self.gpios !== 'undefined') {
            exec('echo ' + self.gpios.reset + ' > /sys/class/gpio/export', function(error, stdout, stderr) {
                try {
                    execSync('echo out > /sys/class/gpio/gpio' + self.gpios.reset + '/direction');
                    execSync('echo 1 > /sys/class/gpio/gpio' + self.gpios.reset + '/value');
                    resolve();
                }
                catch (err) {
                    console.error('command failed: echo out > /sys/class/gpio/gpio' + self.gpios.reset + '/direction');
                    reject(err);
                }
            });
        } else {
            //Running on USB probably
            resolve();
        }
    });
};

var ProbeRS485 = exports.ProbeRS485 = function(options) {
    this.gpios = options.gpios || undefined;
};

//Setup reset pin of FTDI as output with high value 
ProbeRS485.prototype.setupFTDI = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(typeof self.gpios !== 'undefined') {
            exec('echo ' + self.gpios.reset + ' > /sys/class/gpio/export', function(error, stdout, stderr) {
                try {
                    execSync('echo out > /sys/class/gpio/gpio' + self.gpios.reset + '/direction');
                    execSync('echo 1 > /sys/class/gpio/gpio' + self.gpios.reset + '/value');
                    resolve();
                }
                catch (err) {
                    console.error('command failed: echo out > /sys/class/gpio/gpio' + self.gpios.reset + '/direction');
                    reject(err);
                }
            });
        } else {
            //This hardware version do not have FTDI
            resolve();
        }
    });
};
//**********************************************************************************************************
//**********************************************************************************************************