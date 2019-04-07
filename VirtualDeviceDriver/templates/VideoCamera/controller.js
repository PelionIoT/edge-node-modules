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
var Logger = require('./../../utils/logger');
var exec = require('child_process').exec;
var logger = new Logger( {moduleName: 'VideoCamera', color: 'green'} );

var returnCidr = function(mask) {
    var maskNodes = mask.match(/(\d+)/g);
    var cidr = 0;
    for(var i in maskNodes)
    {
      cidr += (((maskNodes[i] >>> 0).toString(2)).match(/1/g) || []).length;
    }
    return cidr;
};

var mask = '255.255.254.0';
var getNetworkAddress = function() {
    var os = require('os');
    var ifaces = os.networkInterfaces();
    var addr;
    Object.keys(ifaces).forEach(function (ifname) {
      var alias = 0;

      ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          return;
        }

        if (alias >= 1) {
          // this single interface has multiple ipv4 addresses
          // console.log(ifname + ':' + alias, iface.address);
        } else {
            if(ifname === 'eth0' || ifname == 'wlan0' || ifname == 'wlan2') {
              // this interface has only one ipv4 adress
              // console.log(ifname, iface.address);
                // console.log(iface);
              addr =  iface.address;
              mask = iface.netmask;
          }
        }
        ++alias;
      });
    });
    return addr;
};

var getMACFromIP = function(networkAddress, lookForMAC, cb) {
    logger.debug('Executing: nmap -sP ' + networkAddress + ' |& grep -B 2 ' + lookForMAC + ' |& grep \'Nmap\'');
    var reg = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
    // exec('nmap -sP ' + networkAddress + ' |& grep -B 2 ' + lookForMAC + ' |& grep \'Nmap\' |& awk \'{print $5}\'', function(error, stdout, stderr) {
    exec('nmap -sP ' + networkAddress + ' |& grep -B 2 ' + lookForMAC + ' |& grep \'Nmap\'', function(error, stdout, stderr) {
        if(error || stdout === '') {
            // logger.error('Got error ' + error);
            cb(error || 'Not found');
        } else {
            if(stderr && !stdout) {
                // logger.error('Got stderr ' + stderr);
                cb(stderr);
            } else {
                var ip = stdout.match(reg);
                cb(null, ip[0].replace(/[^a-zA-Z0-9.]/g,''));
            }
        }
    });
};

//
var VideoCamera = {
    start: function(options) {
        var self = this;
        this._logger = new Logger( {moduleName: options.id, color: 'green'} );
        this._logger.debug('starting controller');
        this._resourceID = options.id;
        this._supportedStates = options.supportedStates;

        //"reachable" event
        self.emit('reachable');
        this._streamURI = {
            "local": 'rtsp://admin:123456@10.10.102.44/H264?ch=1&subtype=0', 
            "public":'rtsp://admin:123456@10.1.110.56/H264?ch=1&subtype=0'
        };
        if( (options.initialState && options.initialState.state) ) {
            this._streamURI = options.initialState.state.stream || this._streamURI;
        }
        this._lookForThisMAC = 'E0:61:B2'; //OUI of HANGZHOU ZENOINTEL TECHNOLOGY CO., LTD camera manufacturer

        this._cameraIP = "10.10.102.44";

        this.inprogress = false;
        this._interval = setInterval(function() {
            if(!this.inprogress) {
                this.inprogress = true;
                self.commands.getCameraIP();
            }
        }, 25000);
        this.commands.getCameraIP();
    },
    stop: function() {
        clearInterval(this._interval);
    },
    state: {
        stream: {
            get: function() {
                return Promise.resolve(this._streamURI);
            },
            set: function(value) {
                return Promise.reject('Read only facade!');
            }
        }
    },
    getState: function() {
        var s = {};
        var self = this;
        var p = [];

        var rejected = false;

        return new Promise(function(resolve, reject) {

            self._supportedStates.forEach(function(type) {
                p.push(
                    new Promise(function(resolve, reject) {
                        self.state[type].get().then(function(value) {
                            self._logger.debug('Got state ' + type + ' value ' + value);
                            if(value !== null) {
                                s[type] = value;
                            }
                            resolve();
                        }).catch(function(e) {
                            self._logger.trace('Get state failed for type ' + type + ' ' + e);
                            s[type] = e;
                            rejected = true;
                            resolve();
                        });
                    })
                );
            });

            Promise.all(p).then(function() {
                self._logger.debug('Got device state ' + JSON.stringify(s));
                s.lastColorCall = self._lastColorCall;
                if(!rejected) {
                    return resolve(s);
                } else {
                    return reject(JSON.stringify(s));
                }
            });
        });
    },
    setState: function(value) {
        var self = this;
        var s = {};
        var p = [];

        var rejected = false;

        return new Promise(function(resolve, reject) {
            Object.keys(value).forEach(function(key) {
                p.push(
                    new Promise(function(resolve, reject) {
                        if(self._supportedStates.indexOf(key) > -1) {
                            self.state[key].set(value[key]).then(function(result) {
                                self._logger.trace('Got result ' + result + ' for key ' + key);
                                s[key] = (result === undefined) ? 'Updated successfully to value ' + value[key] : result;
                                resolve();
                            }).catch(function(e) {
                                self._logger.error(key + ' got error- ' + e);
                                s[key] = e;
                                rejected = true;
                                resolve();
                            });
                        } else {
                            rejected = true;
                            s[key] = 'This interface is not supported';
                            resolve();
                        }
                    })
                );
            });

            Promise.all(p).then(function(result) {
                self._logger.debug('Resolving set state with data ' + JSON.stringify(s));
                if(!rejected) {
                    resolve(s);
                } else {
                    reject(JSON.stringify(s));
                }
            }, function(e) {
                reject(e);
            });
        });
    },
    commands: {
        getCameraIP: function() {
            var self = this;
            return getMACFromIP(getNetworkAddress() + '/' + returnCidr(mask), self._lookForThisMAC, function(err, ip) {
                self.inprogress = false;
                if(err) {
                    logger.error('Failed with error ' + JSON.stringify(err));
                } else {
                    self._cameraIP = ip;
                    logger.debug('Got IP address ' + self._cameraIP);
                    self._streamURI.public = 'rtsp://admin:123456@' + self._cameraIP + '/H264?ch=1&subtype=0';
                    logger.debug('Got stream URI ' + self._streamURI.public);
                    return ip;
                }
            });
        }
    }
};

module.exports = dev$.resource('Core/Devices/Virtual/VideoCamera', VideoCamera);