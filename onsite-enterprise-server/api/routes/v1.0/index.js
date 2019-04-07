'use strict';
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

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const uuid = require('uuid');

//Middleware
const Middleware = require('./middlewares');

//Developer debugging routes
router.use(require('./internal.js'));

var SITE_ID = "abcdefghijklmnopqrstuvwxyzabcdef";
var ACCOUNT_ID = "12345678912345678912345678912345";
var USER_ID = "a1b1c1d1e1f1g1h1j1k1l1m1n1o1p1q1";
var ASSOCIATION_ID = "asdfghjklasdfghjklasdfghjklasdfg";
/*
    req.body = {
      "grant_type": "string",
      "client_id": "string",
      "client_secret": "string",
      "username": "string",
      "password": "string",
      "account_id": "string"
    }
 */
//Proxy for ARM login
router.post('/auth/login', function(req, res) {
    let dummy_accesstoken = {
        userID: 'a1b1c1d1e1f1g1h1j1k1l1m1n1o1p1q1',
        accounts: [],
        associationID: 'asdfghjklasdfghjklasdfghjklasdfg',
        iat: null
    };
    let dummy_resp = {
        access_token: '',
        account_id: '12345678912345678912345678912345',
        token_type: 'bearer',
        expires_in: 86400,
        userID: 'a1b1c1d1e1f1g1h1j1k1l1m1n1o1p1q1'
    };
    // console.log(req.body);
    if(req.body && req.body.grant_type && req.body.username && req.body.password) {
        if(req.body.grant_type == 'password') {
            if(req.body.username == 'directaccess@wigwag.com' && req.body.password == 'wigwagr0x') {
                dummy_accesstoken.iat = Date.now();
                dummy_resp.token = jwt.sign(dummy_accesstoken, 'Local Control Rocks');
                res.status(200).send(dummy_resp);
            } else {
                res.status(401).send();
            }
        } else {
            res.status(401).send();
        }
    } else {
        res.status(401).send();
    }
});

router.post('/oauth/login', function(req, res) {
    let dummy_accesstoken = {
        userID: 'a1b1c1d1e1f1g1h1j1k1l1m1n1o1p1q1',
        accounts: [],
        associationID: 'asdfghjklasdfghjklasdfghjklasdfg',
        iat: null
    };
    let dummy_resp = {
        access_token: '',
        account_id: '12345678912345678912345678912345',
        token_type: 'bearer',
        expires_in: 86400,
        userID: 'a1b1c1d1e1f1g1h1j1k1l1m1n1o1p1q1'
    };
    // console.log(req.body);
    if(req.body && req.body.grant_type && req.body.username && req.body.password) {
        if(req.body.grant_type == 'password') {
            if(req.body.username == 'directaccess@wigwag.com' && req.body.password == 'wigwagr0x') {
                dummy_accesstoken.iat = Date.now();
                dummy_resp.access_token = jwt.sign(dummy_accesstoken, 'Local Control Rocks');
                res.status(200).send(dummy_resp);
            } else {
                res.status(401).send();
            }
        } else {
            res.status(401).send();
        }
    } else {
        res.status(401).send();
    }
});

router.post('/oauth/access_token', function(req, res) {
    let req_body_dummy = {
        userID: 'a1b1c1d1e1f1g1h1j1k1l1m1n1o1p1q1',
        accounts: [],
        associationID: 'asdfghjklasdfghjklasdfghjklasdfg',
        iat: Math.ceil(Date.now()/1000)
    };
    let dummy_resp = {
        access_token: '',
        account_id: '12345678912345678912345678912345',
        token_type: 'bearer',
        expires_in: 86400
    };

    res.status(200).send(dummy_resp);
});

router.delete('/oauth/login', function(req, res) {
    res.status(200).send();
});

//Proxy for ARM
router.post('/auth/logout', function(req, res) {
    res.status(200).send();
});

router.patch('/notifications', function(req, res){
    res.status(200).send();
});

router.get('/events', function(req, res) {
    console.log('Got event request ', req);
});

router.get('/accounts', function(req, res) {
    res.status(200).send({
        "_links": {
            "self": {
              "href": "string"
            },
            "next": {
              "href": "string"
            }
        },
        "_embedded": {
            "accounts": [
              {
                "_links": {
                  "self": {
                    "href": "string"
                  }
                },
                "id": "12345678912345678912345678912345",
                "name": "WigWag Demo Account"
              }
            ]
        }
    });
});

router.get('/siteMap', function(req, res) {
    res.status(200).send({
        "allSites": {
            "abcdefghijklmnopqrstuvwxyzabcdef": {
                "id": "abcdefghijklmnopqrstuvwxyzabcdef",
                "accountID": "12345678912345678912345678912345",
                "active": true,
                "name": "Store 02003",
                "_links": {
                    "self": {
                        "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef"
                    },
                    "relays": [
                        {
                            "href": "string"
                        }
                    ],
                    "resources": {
                        "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/resources"
                    },
                    "groups": {
                        "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/groups/"
                    },
                    "history": {
                        "href": "/accounts/12345678912345678912345678912345/history?siteID=abcdefghijklmnopqrstuvwxyzabcdef"
                    },
                    "database": {
                        "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/database"
                    },
                    "account": {
                        "href": "/accounts/12345678912345678912345678912345"
                    },
                    "interfaces": {
                        "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/interfaces"
                    },
                    "resourcetypes": {
                        "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/resourcetypes"
                    }
                }
            }
        },
        "inGroups": {},
        "outGroups": [
            "abcdefghijklmnopqrstuvwxyzabcdef"
        ],
        "siteNames": {
            "abcdefghijklmnopqrstuvwxyzabcdef": "Store 02003"
        }
    });
});

router.get('/sites/:siteID/devices/data', function(req, res) {
    dev$.selectByID('DevStateManager').get('data').then(function(resp) {
        if(resp && resp.DevStateManager && resp.DevStateManager.response && resp.DevStateManager.response.result) {
            var response = resp.DevStateManager.response.result;
            // console.log('Returning response from DevStateManager');
            res.status(200).send(response);
        } else {
            res.status(500).send();
        }
    });
});

function getDiagnostics() {
    return new Promise(function(resolve, reject) {
        dev$.selectByID('RelayStats').get('diagnostics').then(function(resp) {
            if(resp && resp.RelayStats && resp.RelayStats.response && resp.RelayStats.response.result) {
                // res.status(200).send(resp.RelayStats.response.result);
                resp = resp.RelayStats.response.result;
                if(resp) {
                    if(resp.metadata && resp.metadata.timestamp) {
                        // resp.metadata.timestamp = new Date(1535536861111);
                        var passedTime = Math.ceil((Date.now() - resp.metadata.timestamp)/1000);
                        if(parseInt(passedTime / 60) == 0) {
                            passedTime = passedTime + 's ago';
                        }
                        if(parseInt(passedTime / 60) < 60 && parseInt(passedTime / 60) > 0) {
                            passedTime = parseInt(passedTime / 60) + 'm ago';
                        }
                        if(parseInt(passedTime / 3600) >= 1 && parseInt(passedTime / 3600) < 24) {
                            passedTime = parseInt(passedTime / 3600) + 'h ago';
                        }
                        if(parseInt(passedTime / 86400) >= 1) {
                            passedTime = parseInt(passedTime /86400) + 'd ago';
                        }
                        resp.metadata.lastUpdated = passedTime;
                    }
                    resolve(resp);
                } else {
                    reject();
                }
            } else {
                reject();
            }
        });
    });
}
router.get('/sites/:siteID/diagnostics', function(req, res) {
    getDiagnostics().then(function(resp) {
        res.status(200).send(resp);
    }, function(err) {
        res.status(500).send();
    });
});


/**
 * {
  "_links": {
    "self": {
      "href": "string"
    },
    "next": {
      "href": "string"
    }
  },
  "_embedded": {
    "relays": [
      {
        "_links": {
          "self": {
            "href": "string"
          },
          "site": {
            "href": "string"
          },
          "account": {
            "href": "string"
          },
          "systemConfiguration": "string"
        },
        "ipAddress": "string",
        "pairingCode": "string",
        "accountID": "string",
        "siteID": "string",
        "devicejsConnected": true,
        "devicedbConnected": true,
        "id": "string",
        "coordinates": {
          "latitude": 0,
          "longitude": 0
        }
      }
    ]
  }
}
 */
router.get('/relays', function(req, res) {
    var resp = {
      "_links": {
        "self": {
          "href": "string"
        },
        "next": {
          "href": "string"
        }
      },
      "_embedded": {
        "relays": [
            {
                "_links": {
                    "self": {
                        "href": "string"
                    },
                    "site": {
                        "href": "string"
                    },
                    "account": {
                        "href": "string"
                    },
                    "systemConfiguration": "string"
                },
                "ipAddress": "string",
                "pairingCode": "GVC7Q4PMUK0I2P0H2DV2A2BKH",
                "accountID": ACCOUNT_ID,
                "siteID": SITE_ID,
                "devicejsConnected": true,
                "devicedbConnected": true,
                "id": "0123456789",
                "coordinates": {
                    "latitude": 0,
                    "longitude": 0
                }
            }
        ]
      }
    };
    res.status(200).send(resp);
});

router.get('/sites', function(req, res) {
    var resp = {
      "_links": {
        "self": {
          "href": "string"
        },
        "next": {
          "href": "string"
        }
      },
      "_embedded": {
        "sites": [
          {
            "_links": {
                "self": {
                    "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef"
                },
                "relays": [
                    {
                        "href": "string"
                    }
                ],
                "resources": {
                    "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/resources"
                },
                "groups": {
                    "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/groups/"
                },
                "history": {
                    "href": "/accounts/12345678912345678912345678912345/history?siteID=abcdefghijklmnopqrstuvwxyzabcdef"
                },
                "database": {
                    "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/database"
                },
                "account": {
                    "href": "/accounts/12345678912345678912345678912345"
                },
                "interfaces": {
                    "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/interfaces"
                },
                "resourcetypes": {
                    "href": "/accounts/12345678912345678912345678912345/sites/abcdefghijklmnopqrstuvwxyzabcdef/resourcetypes"
                }
            },
            "accountID": "12345678912345678912345678912345",
            "id": "abcdefghijklmnopqrstuvwxyzabcdef",
            "name": "Store 02003",
            "active": true
          }
        ]
      }
    };
    res.status(200).send(resp);
});


/*
{
    "_links": {
        "self": {
            "href": "/accounts/12345678912345678912345678912345/sites/b34c748c4adb4f72b56b213e14161992/groups/$$DASHBOARD$$"
        },
        "children": []
    },
    "resources": [
        "InvertDO11_dHR5bW9kYnVzV0RSTDAwMDAwOQ",
        "Flexstat1_V0RSTDAwMDAwOQ",
        "VirtualThermostat1125",
        "OAT1_dHR5bW9kYnVzV0RSTDAwMDAwOQ",
        "PhotoCell1_dHR5bW9kYnVzV0RSTDAwMDAwOQ",
        "PhotoCellActive1_dHR5bW9kYnVzV0RSTDAwMDAwOQ",
        "Zone11_dHR5bW9kYnVzV0RSTDAwMDAwOQ",
        "Zone21_dHR5bW9kYnVzV0RSTDAwMDAwOQ",
        "RemoteOverride1_dHR5bW9kYnVzV0RSTDAwMDAwOQ",
        "VirtualLightBulb1110",
        "VirtualVideoCamera2",
        "VirtualContactSensor4",
        "Function11_dHR5bW9kYnVzV0RSTDAwMDAwOQ",
        "Function21_dHR5bW9kYnVzV0RSTDAwMDAwOQ"
    ]
}
 */
router.get('/sites/:siteID/groups/*', function(req, res) {
    // console.log('Going for group- ', req.params[0]);
    dev$.getResourceGroup(req.params[0]).then(function(resp) {
        // console.log('Got ouptut ', resp);
        var response = {
            "_links": {
                "self": {
                    "href": "string"
                },
                "children": []
            },
            "resources": [
            ]
        };
        // response._links.children = Object.keys(resp.children);
        response.resources = Object.keys(resp.resources);
        res.status(200).send(response);
    }, function(err) {
        res.status(500).send(err);
    });
});

router.patch('/sites/:siteID/groups/*', function(req, res) {
    req.body.forEach(function(element) {
        if(element.op == 'add') {
            dev$.joinResourceGroup(element.value, req.params[0]);
        } else if(element.op == 'remove') {
            dev$.leaveResourceGroup(element.value, req.params[0]);
        } else {
            res.status(500).send();
            return;
        }
    });
    res.status(200).send();
});

router.get('/sites/:siteID/resources/state', function(req, res) {
    if(! (req.query && req.query.selection)) {
        res.status(400).send();
        return;
    }
    var resp = {
      "_links": {
        "self": {
          "href": "string"
        }
      },
      "state": {},
      "metadata": {
      },
      "errors": null
    };
    var error = {
        "receivedResponse": true,
        "error": "string"
    };
    dev$.select(req.query.selection).get().then(function(state) {
        // console.log(state);
        var id = Object.keys(state)[0];
        if(state && state[id] && state[id].receivedResponse && state[id].response && !state[id].response.error) {
            resp.state = state[id].response.result;
            res.status(200).send(resp);
        } else {
            resp.errors = {
                [id]: {
                    receivedResponse: state[id].receivedResponse,
                    error: state[id].response ? state[id].response.error : state[id].response
                }
            };
            res.status(200).send(resp);
        }
    }, function(err) {
        console.error('Failed to get state for device ', err);
        res.status(500).send(err);
    }).catch(function(err) {
        console.error('Failed to get state for device ', err);
        res.status(500).send(err);
    });
});

router.patch('/sites/:siteID/resources/state', function(req, res) {
    Object.keys(req.body).forEach(function(id) {
        Object.keys(req.body[id]).forEach(function(type) {
            dev$.selectByID(id).set(type, req.body[id][type]).then(function(resp) {
                if(resp && resp[id] && resp[id].response && !resp[id].response.error) {
                    res.status(200).send();
                } else {
                    console.log('Failed ', resp);
                    res.status(500).send();
                }
            }, function(err) {
                res.status(500).send();
            });
        });
    });
});


/*
 *{
  "_links": {
    "self": {
      "href": "string"
    },
    "next": {
      "href": "string"
    }
  },
  "_embedded": {
    "users": [
      {
        "_links": {
          "self": {
            "href": "string"
          },
          "accounts": {
            "href": "string"
          },
          "roles": {
            "href": "string"
          }
        },
        "email": "string",
        "id": "string",
        "name": "string"
      }
    ]
  }
}
*/
router.get('/users', function(req, res) {
    var resp = {
      "_links": {
        "self": {
          "href": "string"
        },
        "next": {
          "href": "string"
        }
      },
      "_embedded": {
        "users": [
          {
            "_links": {
              "self": {
                "href": "string"
              },
              "accounts": {
                "href": "string"
              },
              "roles": {
                "href": "string"
              }
            },
            "email": "directaccess@wigwag.com",
            "id": USER_ID,
            "name": "WigWag Gateway"
          }
        ]
      }
    };
    res.status(200).send(resp);
});

router.patch('/sites/:siteID/users/:userID/resources/state', function(req, res) {
    Object.keys(req.body).forEach(function(id) {
        Object.keys(req.body[id]).forEach(function(type) {
            dev$.selectByID(id).set(type, req.body[id][type]).then(function(resp) {
                if(resp && resp[id] && resp[id].response && !resp[id].response.error) {
                    res.status(200).send();
                } else {
                    console.log('Failed ', resp);
                    res.status(500).send();
                }
            }, function(err) {
                res.status(500).send();
            });
        });
    });
});

/*
[{
        "id": "Flexstat1_V0RSTDAwMDAwOQ",
        "type": "Core/Devices/BACnetMSTP/Thermostat/Flexstat1_V0RSTDAwMDAwOQ",
        "reachable": true,
        "interfaces": [
            "Facades/HasTemperature",
            "Facades/ThermostatSupplyTemperature",
            "Facades/ThermostatReturnTemperature",
            "Facades/UnoccupiedCoolTemperatureLevel",
            "Facades/UnoccupiedHeatTemperatureLevel",
            "Facades/ThermostatDeadband",
            "Facades/OccupiedCoolTemperatureLevel",
            "Facades/OccupiedHeatTemperatureLevel",
            "Facades/ThermostatGStatus",
            "Facades/ThermostatY1Status",
            "Facades/ThermostatY2Status",
            "Facades/ThermostatW1Status",
            "Facades/ThermostatW2Status",
            "Facades/OccupancyMode",
            "Facades/ThermostatOccupiedFanMode",
            "Facades/ThermostatUnoccupiedFanMode",
            "Facades/ThermostatMode",
            "Core/Interfaces/Metadata",
            "Facades/ThermostatModeStatus",
            "Facades/ThermostatFanStatus"
        ],
        "groups": [],
        "permissions": [
            "state_get",
            "state_set"
        ],
        "name": "Flexstat 001",
        "icon": "&#x0074"
    }, ... ]
 */
function getDevices(req, res) {
    dev$.select('id=*').listResources().then(function(resources) {
        var response = [];
        dev$.selectByID('DevStateManager').get('data').then(function(resp) {
            if(resp && resp.DevStateManager && resp.DevStateManager.response && resp.DevStateManager.response.result) {
                var devState = resp.DevStateManager.response.result;
                Object.keys(resources).forEach(function(id) {
                    if(devState[id] && devState[id].facades) {
                        var temp = {
                            id: id,
                            type: resources[id].type,
                            reachable: resources[id].reachable,
                            interfaces: devState[id].facades || [],
                            groups: [],
                            permissions: [ "state_get", "state_set" ],
                            name: devState[id].name || id,
                            icon: devState[id].icon || "&#x2b1f"
                        };
                        response.push(temp);
                    }
                });
                res.status(200).send(response);
            } else {
                res.status(500).send();
            }
        });
    }, function(err) {
        res.status(500).send();
    });
}
router.get('/sites/:siteID/devices', getDevices);

/*
 *{
  "_links": {
    "self": {
      "href": "string"
    }
  },
  "resources": [
    {
      "id": "string",
      "type": "string",
      "reachable": "string",
      "interfaces": [
        "string"
      ],
      "groups": [
        "string"
      ],
      "permissions": [
        "string"
      ]
    }
  ]
}
*/
router.get('/sites/:siteID/resources', function(req, res) {
    var selection = 'id=*';
    if(req.query) {
        if(req.query.selection) {
            selection = req.query.selection;
        }
    }
    dev$.select(selection).listResources().then(function(resources) {
        var response = {
          "_links": {
            "self": {
              "href": "string"
            }
          },
          "resources": [
          ]
        };
        dev$.listResourceTypes().then(function(resourceTypes) {
            Object.keys(resources).forEach(function(id) {
                var temp = {
                    id: id,
                    type: resources[id].type,
                    reachable: resources[id].reachable,
                    interfaces: resourceTypes[resources[id].type]['0.0.1'].interfaces || [],
                    groups: [],
                    permissions: [ "state_get", "state_set" ]
                };
                response.resources.push(temp);
            });
            res.status(200).send(response);
        });
    }, function(err) {
        res.status(500).send();
    });
});

router.patch('/sites/:siteID/devices/:deviceID/name', function(req, res) {
    dev$.selectByID("DevStateManager").call('saveDeviceName', req.params.deviceID, req.body.name).then(function(resp) {
        if(resp && resp.DevStateManager && resp.DevStateManager.response && !resp.DevStateManager.response.error) {
            res.status(200).send();
        } else {
            console.error('Failed to save name ', resp);
            res.status(500).send();
        }
    }, function(err) {
        console.error('Failed to save name ', err);
        res.status(500).send();
    });
});

//Got the APIs from wigwag-cloud
const crypto = require('crypto');
router.post('/web/wigwag-device-pairing/api/v2/createPairingMessage', function(req, res) {
    let deviceSerial = req.body.deviceSerial;
    let aesNetwork = req.body.aesNetwork;

    let deviceInfo = req.body.deviceInfo;
    // let accountID = req.accountID;

    // if(!accountID) {
    //     res.status(401).send()
    //     return
    // }

    if(typeof deviceSerial != 'string') {
        res.status(400).send('Invalid device serial');
        return;
    }

    if(!/^[0-9A-Fa-f]{32}$/.test(aesNetwork)) {
        res.status(400).send('Invalid aes network key');
        return;
    }
    // return Devices.getDeviceInfo(deviceSerial).then(function(deviceInfo) {
    // need to ensure the request comes from a relay
    // if(deviceInfo.accountID == null || deviceInfo.accountID == accountID) {
    let aesDevice = new Buffer(deviceInfo.aesKey, 'hex');  // 128 bit key. hex encoded
    let cipher = crypto.createCipheriv('aes-128-cbc', aesDevice, new Buffer([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]));
    let encryptedNetworkKey = cipher.update(aesNetwork, 'hex', 'hex') + cipher.final('hex');

    // return encryptedNetworkKey
    // }
    // else {
    //     throw new Error('Already bound')
    // }
    // }).then(function(encryptedNetworkKey) {
    res.status(200).send(encryptedNetworkKey);
    // }, function(error) {
    //     if(error.reason == 'No such device' || error.reason == 'No such relay') {
    //         res.status(404).send(error.reason)
    //     }
    //     else if(error.message == 'Already bound') {
    //         res.status(403).send('Already bound')
    //     }
    //     else {
    //         res.status(500).send('An internal server error occurred');
    //     }
    // });
});

router.post('/web/wigwag-device-pairing/api/v1/bindDeviceToAccount', function(req, res) {
    res.status(200).send({ ok: true });
});

router.post('/web/wigwag-device-pairing/api/v1/unbindDeviceFromAccountRelay', function(req, res) {
    res.status(200).send({ ok: true });
});


//**********************************************************************
// GET File
//**********************************************************************
function isImage(extension){
    if(extension=="jpg" || extension=="png" || extension=="jpeg" || extension=="gif"){
        return true;
    }
    return false;
}

function parseFile(fileName){
    return new Promise(function(resolve, reject){
        var extension = fileName.split('.').pop().toLowerCase();
        var newFile;
        if(isImage(extension)) {
            newFile = path.join(__dirname, '../') + '/pages/images/'+fileName;
        }else{
            newFile = path.join(__dirname, '../') + '/pages/'+extension+'/'+fileName;
        }
        let CONTENT_TYPE = "text/plain";
        let TYPE = "";

        // console.log(extension);

        fs.readFile(newFile, 'utf8', function(err, contents) {
            if(err){
                //res.status(404).send(""+err);
                reject(err);
            }else{
                if(extension=="json"){
                    CONTENT_TYPE = 'text/plain';
                }else if(extension=="js"){
                    CONTENT_TYPE = 'application/javascript';
                }else if(extension =="html"){
                    CONTENT_TYPE = 'text/html';
                }else if(extension =="css"){
                    CONTENT_TYPE = 'text/css';
                }else if(isImage(extension)){
                    CONTENT_TYPE = "image/jpg";
                    var bitmap = fs.readFileSync(newFile);
                    var encodedImage = new Buffer(bitmap).toString('base64');
                    contents = encodedImage;
                    TYPE = "base64";
                }
                let output = {content:contents,contentType:CONTENT_TYPE,type:TYPE};
                resolve(output);
            }
        });
    });
}
let readPage = (req,res)=>{
    try{
        var fileName = req.params.fileName;
        var promise = parseFile(fileName);
        promise.then(function(result) {
        res.writeHead(200, {'Content-Type': result.contentType});
            res.write(result.content, result.type);
            res.end();
        }, function(error) {
            res.status(500).send(error);
        });
    }catch(err){
        res.status(500).send(err);
    }
};
router.get('/web/:fileName', readPage);
//**********************************************************************

var wizardjson = [
    {
        "heading": "Connection setup",
        "image":"RP200_bacnet_1.png",
        "comment":"Please make sure to connect the BACnet to bottom RS485 port.<br>Also verify that all bacnet devices are powered and gateway is in <b>SOLID BLUE</b> state.",
        "type":"bacnet",
        "absolute":"false"
    },
    {
        "heading": "Visual Inspection",
        "image":"RP200_bacnet_2.png",
        "comment":"The bottom TX and RX LEDs (labelled T and R) will start lighting up when gateway is trying to discover the bacnet devices or communicating with the devices.",
        "type":"bacnet",
        "absolute":"false"
    },
    {
        "heading": "Connection setup",
        "image":"RP200_modbus_1.png",
        "comment":"Please make sure to connect the Modbus to top RS485 port.<br>Also verify that all modbus devices are powered and gateway is in <b>SOLID BLUE</b> state.",
        "type":"modbus",
        "absolute":"false"
    },
    {
        "heading": "Visual Inspection",
        "image":"RP200_modbus_2.png",
        "comment":"The top TX and RX LEDs (labelled T and R) will start lighting up when gateway is trying to discover the modbus devices or communicating with the devices.",
        "type":"modbus",
        "absolute":"false"
    },
    {
        "heading": "Gateway connection setup",
        "image":"RP200_pairing.png",
        "comment":"Please make sure the connections are made as indicated in the above image.<br>The gateway status LED should be in <b>BLINKING BLUE</b> state.",
        "type":"pairing",
        "absolute":"false"
    }
];

let uiFlowType = {
    "Bacnet": 1,
    "Modbus": 1,
    "Virtual": 2,
    "6LoWPAN": 3,
    "Z-Wave": 3,
    "ZigBee": 3
};

let enableUI = {
    "Bacnet": true,
    "Modbus": true,
    "Virtual": true,
    "6LoWPAN": false,
    "Z-Wave": false,
    "ZigBee": false
};

function getServiceWizard(deviceName,wizardObject){
    let arr = wizardObject;
    let obj = [];
    arr.forEach(function(data){
        if(data.type.toLowerCase()===deviceName.toLowerCase()){
            obj.push(data);
        }
    });
    return obj;
}

router.get('/sites/:siteID/protocols', function(req, res) {
    getDiagnostics().then(function(resp) {
        var mainObj = [];
        if(resp && resp.Peripherals) {
            Object.keys(resp.Peripherals).forEach((key) => {
                var modStatus = {};
                if(resp.Peripherals[key] === 'up' || resp.Peripherals[key] === 'UP' ||
                    resp.Peripherals[key] === 'down' || resp.Peripherals[key] === 'DOWN') {
                    modStatus.serviceName = key;
                    modStatus.status = resp.Peripherals[key];
                    modStatus.wizard = getServiceWizard(key, wizardjson);
                    modStatus.uiFlowType = uiFlowType[key];
                    modStatus.enableUI = enableUI[key];
                    if(resp.DevicesPerProtocol) {
                        modStatus.devices = resp.DevicesPerProtocol[key];
                    }
                    mainObj.push(modStatus);
                }
            });
            res.status(200).send(mainObj);
        } else {
            res.status(500).send();
        }
    }, function(err) {
        res.status(500).send();
    });
});

let allRecipes = [
    "KMC_Controls_Inc_BAC10051C_Thermostat",
    "KMC_Controls_Inc_BAC120063C_Lighting",
    "Veris_Industries_CWLPHXX001030B6_CO2_Sensor",
    "Viconics_Technologies_8000_Series_Thermostat"
];
router.get('/sites/:siteID/protocols/bacnet/discover', function(req, res) {
    dev$.selectByID('BacnetDriver').get('discover').then(function(resp) {
        let data = {
            "devices": {},
            "recipes": allRecipes
        };
        if(resp && resp.BacnetDriver && resp.BacnetDriver.response && resp.BacnetDriver.response.result) {
            data.devices = resp.BacnetDriver.response.result;
            res.status(200).send(data);
        } else {
            res.status(500).send();
        }
    }, function(err) {
        res.status(err.statusCode || 500).send(err.statusMessage || err);
    });
});

router.patch('/sites/:siteID/protocols/virtual/:resourceID/debug', function(req, res) {
    dev$.selectByID(req.params.resourceID).call('emit').then(function() {
        res.status(200).send();
    }, function(err) {
        res.status(500).send();
    });
});

let glyphPerType = {
    'ContactSensor': "&#x00aa",
    'Battery': "&#x2b3e",
    'Button': "&#x2b66",
    'DoorLock': "&#x2b56",
    'Flipflop': "&#x0067",
    'HumiditySensor': "&#x00ae",
    'LightBulb': "&#x2b09",
    'Luminance': "&#x0030",
    'MotionSensor': "&#x004d",
    'MultiSensor': "&#x007c",
    'Override': "&#x0067",
    'PanelLight': "&#x2b09",
    'Regulator': "&#x0064",
    'SmokeAlarm': "&#x2b53",
    'Temperature': "&#x0074",
    'Thermostat': "&#x0074",
    'Ultraviolet': "&#x00e5",
    'VibrationSensor': "&#x004c",
    'VideoCamera': "&#x003e",
    'WaterLeak': "&#x2b3c"
};

router.get('/sites/:siteID/protocols/virtual/types', function(req, res) {
    var devices = {};
    var p = [];
    function next(err, result) {
        if(err) {
            return;
        }

        var prefix = result.prefix;
        var id = result.key.substring(prefix.length);

        var siblings = result.siblings;
        if(siblings.length !== 0) {
            try {
                var resource;
                try {
                    resource = JSON.parse(siblings[0]);
                } catch(err) {
                    resource = siblings[0];
                }
                devices[id] = resource;
            } catch(e) {
                console.error("json parse failed with error- " + e);
            }
        } else {
            console.error("Key was deleted");
        }
    }
    ddb.shared.getMatches('VirtualDriver.devices.', next).then(function() {
    // req.dcs.getKeysdata(req.params.siteID, "shared", "prefix", "VirtualDriver.devices.").then(function(devices) {

        try {
            // if(devices && devices.keys) {
            let devicePerType = {};
            Object.keys(devices).forEach(function(id) {
                let type = devices[id];
                // devices.keys.forEach(function(device) {
                    // let type;
                // try {
                //     type = JSON.parse(device.siblings[0]);
                // } catch(err) {
                //     type = device.siblings[0];
                // }
                if(typeof devicePerType[type] == 'undefined') {
                    devicePerType[type] = {
                        "count": 0,
                        "enable": true,
                        "devices": [],
                        "icon": ""
                    };
                }
                devicePerType[type].count++;
                if(devicePerType[type].count > 2) {
                    devicePerType[type].enable = false;
                }
                // if(device.key && typeof device.key == 'string') {
                devicePerType[type].devices.push(id);
                // }
                devicePerType[type].icon = glyphPerType[type] || "&#x2b1f";
                // });

                ddb.shared.get("VirtualDriver.discoveryReport").then(function(report) {
                    if(report && report.siblings && report.siblings[0]) {
                        let progressReport = JSON.parse(report.siblings[0]);
                        Object.keys(progressReport).forEach(function(type) {
                            if(typeof devicePerType[type] == 'undefined') {
                                devicePerType[type] = {
                                    "count": 0,
                                    "enable": true,
                                    "devices": [],
                                    "icon": ""
                                };
                            }
                            devicePerType[type].progressReport = progressReport[type];
                            devicePerType[type].inProgress = progressReport[type].inProgress;
                            devicePerType[type].icon = glyphPerType[type] || "&#x2b1f";
                        });
                        res.status(200).send(devicePerType);
                    } else {
                        res.status(500).send('Failed to get progress report of virtual devices!');
                    }
                }, function(err) {
                    res.status(err.statusCode || 500).send(err.statusMessage || err);
                });
            });
        } catch(err) {
            console.error("Failed ", err);
            res.status(500).send(err);
        }
    }, function(err) {
        res.status(err.statusCode || 500).send(err.statusMessage || err);
    });
});

var allRequests = {};
var allRequestsResponse = {};
router.post('/requests', function(req, res) {
    if(!req.body) {
        res.status(400).send();
        return;
    }
    if(req.body.sites[0] !== SITE_ID) {
        res.status(404).send();
        return;
    }
    if(req.body.ops.length > 1) {
        console.error('onsite-server: More than one operation are not allowed with /requests on local server!');
    }
    if(!(req.body.ops[0].type == 'call' || req.body.ops[0].type == 'set' || req.body.ops[0].type == 'get')) {
        res.status(404).send('Unknown operation type!');
        return;
    }
    if(req.body.ops[0].type == 'call' && !req.body.ops[0].command) {
        res.status(400).send('Command is not defined in the ops for type call!');
        return;
    }
    if((req.body.ops[0].type == 'set' || req.body.ops[0].type == 'get') && !req.body.ops[0].property) {
        res.status(400).send('Property is not defined in the ops for type set or get!');
        return;
    }
    if(!req.body.ops[0].selection) {
        res.status(400).send('Selection is not defined!');
        return;
    }
    var id = uuid.v4().replace(/-/g, '');
    allRequests[id] = {
      "_links": {
        "self": {
          "href": "string"
        },
        "response": {
          "href": "string"
        }
      },
      "expires": 0,
      "id": id,
      "state": "submitted",
      "errorStateReason": "string",
      "sitesProcessed": 0,
      "sites": [
        SITE_ID
      ],
      "errors": 0,
      "ops": [
        req.body.ops[0]
      ]
    };
    allRequests[id].state = "running";
    allRequestsResponse[id] = {};
    if(req.body.ops[0].type == 'call') {
        dev$.select(req.body.ops[0].selection).call(req.body.ops[0].command, req.body.ops[0].arguments[0]).then(function(resp) {
            allRequests[id].state = "complete";
            allRequestsResponse[id].response = resp;
        }).catch(function(err) {
            allRequests[id].state = "complete";
            allRequestsResponse[id].response = err;
        });
    }
    if(req.body.ops[0].type == 'set') {
        dev$.select(req.body.ops[0].selection).set(req.body.ops[0].property, req.body.ops[0].value).then(function(resp) {
            allRequests[id].state = "complete";
            allRequestsResponse[id].response = resp;
        }).catch(function(err) {
            allRequests[id].state = "complete";
            allRequestsResponse[id].response = err;
        });
    }
    if(req.body.ops[0].type == 'get') {
        dev$.select(req.body.ops[0].selection).call(req.body.ops[0].property).then(function(resp) {
            allRequests[id].state = "complete";
            allRequestsResponse[id].response = resp;
        }).catch(function(err) {
            allRequests[id].state = "complete";
            allRequestsResponse[id].response = err;
        });
    }
    res.status(202).send(allRequests[id]);
});

router.get('/requests/:requestID', function(req, res) {
    if(Object.keys(allRequests).indexOf(req.params.requestID) <= -1) {
        res.status(404).send();
        return;
    }
    return res.status(200).send(allRequests[req.params.requestID]);
});

router.get('/requests/:requestID/response', function(req, res) {
    function cleanup(id) {
        setTimeout(function() {
            console.log('Cleaning up!');
            delete allRequests[id];
            delete allRequestsResponse[id];
            console.log(allRequests);
            console.log(allRequestsResponse);
        }, 5000);
    }

    if(Object.keys(allRequests).indexOf(req.params.requestID) <= -1) {
        res.status(404).send();
        return;
    }
    var id = req.params.requestID;
    var reply = {
      "_links": {
        "self": {
          "href": "string"
        },
        "next": {
          "href": "string"
        }
      },
      "_embedded": {
            "responses": [
            {
              "siteID": SITE_ID,
              "op": 0,
              "errors": 0,
              "timeouts": 0,
              "response": [
              ]
            }
          ]
      }
    };
    var resp = {
      "resourceID": "string",
      "timeout": false,
      "error": false,
      "body": null
    };
    if(!allRequestsResponse[id]) {
        resp.error = true;
        resp.body = "Failed to locate the response of this requestID";
    }
    var resourceID = Object.keys(allRequestsResponse[id].response)[0];
    if(!resourceID) {
        resp.error = true;
        resp.body = "Resource is unreachable!";
        res.status(200).send(reply);
        cleanup(id);
        return;
    }
    resp.resourceID = resourceID;
    if(allRequestsResponse[id].response && allRequestsResponse[id].response[resourceID] && allRequestsResponse[id].response[resourceID].receivedResponse &&
        allRequestsResponse[id].response[resourceID].response && !allRequestsResponse[id].response[resourceID].response.error) {
        resp.body = allRequestsResponse[id].response[resourceID].response.result;
    } else {
        resp.error = true;
        resp.body = allRequestsResponse[id].response[resourceID].response ? allRequestsResponse[id].response[resourceID].response.error : allRequestsResponse[id].response[resourceID].response;
    }
    reply._embedded.responses[0].response.push(resp);
    res.status(200).send(reply);
    cleanup(id);

    return;
});

module.exports = router;
