'use strict'
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

const url = require('url')
const fs = require('fs')
const path = require('path')
const configurator = require('devjs-configurator')
const WigWagAuthorizer = require('edge-authorizer')
const request = require('request')
const semver = require('semver')
const RelayStatsProvider = require('./relayStatsProvider');
const os = require('os');

// function waitForBootup() {
//     let ipStack = dev$.select('id="IPStack"')

//     ipStack.discover()

//     return new Promise(function(resolve, reject) {
//         var count = 0

//         function n(selection) {
//             count += 1

//             selection.stopDiscovering()

//             if(count == 1) {
//                 resolve()
//             }
//         }

//         ipStack.on('discover', function() { n(ipStack) })
//     })
// }

function getIPV4Address() {
    // var ipStack = dev$.select('id="IPStack"')

    // return new Promise(function(resolve, reject) {
    //     var i = setInterval(function() {
    //         ipStack.call('getPrimaryIpAddress').then(function(result) {
    //             if(result['IPStack']) {
    //                 if(result['IPStack'].response.error) {
    //                     return null
    //                 }
    //                 else if(result['IPStack'].response.result) {
    //                     return result['IPStack'].response.result
    //                 }
    //                 else {
    //                     return null
    //                 }
    //             }
    //             else {
    //                 return null
    //             }
    //         }).then(function(address) {
    //             if(typeof address === 'string') {
    //                 if(address.indexOf('/') != -1) {
    //                     address = address.substring(0, address.indexOf('/'))
    //                 }

    //                 clearInterval(i)
    //                 resolve(address)
    //             }
    //         })
    //     }, 3000)
    // })
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
            if(ifname === 'eth0' || ifname == 'wlan0') {
              // this interface has only one ipv4 adress
              // console.log(ifname, iface.address);
              addr =  iface.address;
          }
        }
        ++alias;
      });
    });
    return addr;
}


function waitForBootup() {
    return new Promise(function(resolve, reject) {

        var checkIfConnected = function() {
            setTimeout(function() {
                if(!getIPV4Address()) {
                    // console.log('Not connected yet. Try in 5 sec');
                    checkIfConnected();
                } else {
                    // console.log("Connected");
                    resolve();
                }
            }, 5000);
        };

        checkIfConnected();
    });
}

function getSoftwareVersion(versionsFile) {
    versionsFile = path.resolve(__dirname, versionsFile)

    return new Promise(function(resolve, reject) {
        fs.readFile(versionsFile, 'utf8', function(error, data) {
            if(error) {
                reject(error)
                return
            }

            let parsedVersion

            try {
                parsedVersion = JSON.parse(data)
            }
            catch(error) {
                reject(error)
                return
            }

            if(!('packages' in parsedVersion)) {
                reject(new Error('No packages listed in versions file'))
                return
            }

            if(!Array.isArray(parsedVersion.packages)) {
                reject(new Error('Packages is not an array'))
                return
            }

            let wigwagFirmwareVersion

            for(let i = 0; i < parsedVersion.packages.length; i += 1) {
                let packageInfo = parsedVersion.packages[i]

                if(packageInfo == null || typeof packageInfo != 'object') {
                    continue
                }

                if(packageInfo.name != 'WigWag-Firmware') {
                    continue
                }

                if(!semver.valid(packageInfo.version)) {
                    reject(new Error('WigWag-Firmware version number is not a proper semantic version'))
                    return
                }

                wigwagFirmwareVersion = packageInfo.version
            }

            if(!wigwagFirmwareVersion) {
                reject(new Error('No WigWag-Firmware package found in packages array'))
                return
            }

            resolve(wigwagFirmwareVersion)
        })
    })
}

function sendRelayStats(ipV4Address, softwareVersion, cloudAddress, relayIdentityToken) {
    return new Promise(function(resolve, reject) {
        var req_url = url.resolve(cloudAddress, '/api/relays/stats');
        request.post(req_url, {
            headers: {
                Authorization: relayIdentityToken
            },
            body: {
                ipAddress: ipV4Address,
                softwareVersion: softwareVersion
            },
            json: true
        }, function(error, response, responseBody) {
            if(error) {
                reject(error)
            }
            else {
                if(response.statusCode != 200) {
                    reject(req_url + ' ' + response.statusCode + ' ' + response.statusMessage)
                }
                else {
                    resolve()
                }
            }
        })
    })
}

let ipV4Address
let softwareVersion
let config

configurator.configure('RelayStatsSender', __dirname, './config.json').then(function(conf) {
    config = conf

    function startDeviceController() {
        let providerId = 'RelayStats';
        let statsProvider = new RelayStatsProvider(providerId);
        config.id = providerId;
        log.info('Trying to start RelayStats device controller');
        statsProvider.start(config).then(function() {
            log.info('RelayStatsSender started successfully');
        }, function(err) {
            if(typeof err.status !== 'undefined' && err.status == 500 && err.response == 'Already registered') {

            } else {
                log.error('RelayStatsSender failed to start ' + JSON.stringify(err) + ' will try again in 5 seconds!');
                setTimeout(function() {
                    startDeviceController();
                }, 5000);
            }
        });
    }

    startDeviceController();

    return waitForBootup()
}).then(function() {
    log.info('RelayStatsSender starting')

    return getIPV4Address()
}).then(function(ipAddress) {
    ipV4Address = ipAddress

    return getSoftwareVersion(config.versionsFile)
}).then(function(version) {
    softwareVersion = version

    log.info('RelayStatsSender sending', { ipAddress: ipV4Address, softwareVersion: softwareVersion })

    let wigwagAuthorizer = new WigWagAuthorizer({
        relayID: config.relayID,
        relayPrivateKey: fs.readFileSync(config.ssl.key),
        relayPublicKey: fs.readFileSync(config.ssl.cert),
        ddb: ddb
    })

    return sendRelayStats(ipV4Address, softwareVersion, config.cloudAddress, wigwagAuthorizer.generateRelayIdentityToken())
}).then(function() {
    log.info('RelayStatsSender successful')
}, function(error) {
    log.error('RelayStatsSender error', error)
});