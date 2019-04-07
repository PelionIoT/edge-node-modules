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
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const fs = require('fs');
const jsonminify = require('jsonminify');
const http = require('http');
const WebSocket = require('ws');


//Logger
const Logger = require('./utils/logger');
const logger = new Logger( {moduleName: 'Module', color: 'bgBlue'} );

//Configuration
// const config = JSON.parse(jsonminify(fs.readFileSync('./res-config.json', 'utf8')));
// const port = config.prodPort;
// global.resLogLevel = config.logLevel || 2;

// const config = JSON.parse(jsonminify(fs.readFileSync('./res-config.json', 'utf8')));
const port = 3131;
global.resLogLevel = 2;

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ limit: '50mb',extended: true }));
// parse requests of content-type - application/json
app.use(bodyParser.json({limit: '50mb'}));
// app.use(device.capture());


try {
    app.use(require('./api/routes'));
} catch(err) {
    logger.error('Could not load routes ' + JSON.stringify(err));
    console.error(err);
    process.exit(1);
}

/*
{
  "stream": [string],                                 // Which event stream does this data come from
  "siteID": [string],                                 // ID of the site where this data was generated
  "accountID": [string],                              // Account that this site belongs to
  "relayID": [string],                                // relay that generated this data          
  "timestamp": [integer],                             // unix timestamp in milliseconds when this data was generated
  "body": [AlertBody|DeviceStateBody|DeviceEventBody] // Body format determined by "stream"
}
Example: State
{
    "type": "publish",
    "payload": {
        "stream": "state",
        "siteID": "d8c5f05360864a64b1279f8f5d4f61e3",
        "accountID": "d55fa29dbad3418883374168ba4791fd",
        "relayID": "WDRL000008",
        "timestamp": 1525992479994,
        "body": {
            "type": "power",
            "source": "VirtualLightBulb168",
            "data": "\"off\"",
            "serial": 139762
        }
    }
}
Example: event
{
    "type": "publish",
    "payload": {
        "stream": "event",
        "siteID": "d8c5f05360864a64b1279f8f5d4f61e3",
        "accountID": "d55fa29dbad3418883374168ba4791fd",
        "relayID": "WDRL000008",
        "timestamp": 1525992604697,
        "body": {
            "type": "motion",
            "source": "VirtualMultiSensor167",
            "data": "true",
            "serial": 139763
        }
    }
}
 */
var serial = 0;

var allEvents = dev$.select('id=*');
allEvents.subscribeToEvent('+');
allEvents.on('event', function(id, type, data) {
    logger.debug('Event- Device ' + id + ' type ' + type + ' data ' + JSON.stringify(data));
    wss.clients.forEach(function(client){
        var pkt = {
            type: "publish",
            payload: {
              "stream": "event",
              "siteID": "abcdefghijklmnopqrstuvwxyzabcdef",
              "accountID": "12345678912345678912345678912345",
              "relayID": "WDRLXXXXXX",
              "timestamp": Date.now(),
              "body": {
                "type": type,
                "source": id,
                "data": data,
                "serial": serial++
              }
            }
        };
        client.send(JSON.stringify(pkt), function(err) {
          if(err) {
            logger.error('Websocket failed ', err);
            return;
          }
        });
    });
});

var allStates = dev$.select('id=*');
allStates.subscribeToState('+');
allStates.on('state', function(id, type, data) {
    logger.debug('State- Device ' + id + ' type ' + type + ' data ' + JSON.stringify(data));
    wss.clients.forEach(function(client){
        var pkt = {
            type: "publish",
            payload: {
              "stream": "state",
              "siteID": "abcdefghijklmnopqrstuvwxyzabcdef",
              "accountID": "12345678912345678912345678912345",
              "relayID": "WDRLXXXXXX",
              "timestamp": Date.now(),
              "body": {
                "type": type,
                "source": id,
                "data": data,
                "serial": serial++
              }
            }
        };
        client.send(JSON.stringify(pkt), function(err) {
          if(err) {
            logger.error('Websocket failed ', err);
            return;
          }
        });
    });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', function connection(ws,req) {
  logger.info('Client socket connected');
  ws.on('message', function incoming(data) {
    logger.info('Got subcription requests- ' + data);
  });
});

server.on('upgrade', function upgrade(request, socket, head) {
  if (request.url == "/api/accounts/12345678912345678912345678912345/events" || request.url == "/wigwag/api/accounts/12345678912345678912345678912345/events" ||
    request.url == "/api/events" || request.url == "/wigwag/api/events") {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, () => {
    logger.info(`Server started on port ${port} :)`);
});


logger.info('Regional RESTful API server started on: ' + port);
