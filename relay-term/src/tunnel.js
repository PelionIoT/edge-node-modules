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

const validate = require('jsonschema').validate
const ws = require('ws')
const EventEmitter = require('events').EventEmitter

const DefaultPingPeriod = 30000
const DefaultTimeoutPeriod = 60000

const CloseNormalClosure           = 1000
const CloseGoingAway               = 1001
const CloseProtocolError           = 1002
const CloseUnsupportedData         = 1003
const CloseNoStatusReceived        = 1005
const CloseAbnormalClosure         = 1006
const CloseInvalidFramePayloadData = 1007
const ClosePolicyViolation         = 1008
const CloseMessageTooBig           = 1009
const CloseMandatoryExtension      = 1010
const CloseInternalServerErr       = 1011
const CloseServiceRestart          = 1012
const CloseTryAgainLater           = 1013
const CloseTLSHandshake            = 1015

const WindowResizePayloadSchema = {
    type: 'object',
    properties: {
        width: {
            type: 'integer',
            minimum: 0
        },
        height: {
            type: 'integer',
            minimum: 0
        }
    },
    required: [ 'width', 'height' ]
}

const MessageEnvelopeSchema = {
    allOf: [
        {
            type: 'object',
            properties: {
                type: {
                    type: 'string'
                },
                sessionID: {
                    type: 'string'
                }
            },
            required: [ 'type', 'payload', 'sessionID' ]
        }
    ],
    oneOf: [
        {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    pattern: '^resize$'
                },
                payload: WindowResizePayloadSchema
            }
        },
        {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    pattern: '^input$'
                },
                payload: {
                    type: 'string'
                }
            }
        },
        {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    pattern: '^output$'
                },
                payload: {
                    type: 'string'
                }
            }
        },
        {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    pattern: '^start$'
                },
                payload: {
                    type: 'string'
                }
            }
        },
        {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    pattern: '^end$'
                },
                payload: {
                    type: 'string'
                }
            }
        }
    ]
}

class Tunnel extends EventEmitter {
    constructor(options) {
        super()

        this.cloudURL = options.cloudURL
        this.cert = options.cert
        this.key = options.key
        this.noValidate = options.noValidate
        this.reconnectWait = 0

        this._establishConnection()
    }

    send(sessionID, output) {
        if(this._socket && this._socket.readyState === ws.OPEN) {
            this._socket.send(JSON.stringify({ type: 'output', sessionID: sessionID, payload: output }))
        }
    }

    end(sessionID) {
        if(this._socket && this._socket.readyState === ws.OPEN) {
            this._socket.send(JSON.stringify({ type: 'end', sessionID: sessionID, payload: sessionID }))
        }
    }

    _establishConnection() {
        console.log('Relay term tunnel attempting to establish cloud connection in ' + this.reconnectWait + 'seconds...')

        let reconnect = () => {
            if(this.reconnectWait == 0) {
                this.reconnectWait = 1
            }
            else if(this.reconnectWait < 32) {
                this.reconnectWait *= 2
            }

            this._establishConnection()
        }

        let pongTimeout
        let pingTimeout

        let waitForPongTimeout = () => {
            pongTimeout = setTimeout(() => {
                console.log('Relay term connection timed out (No pong received after %d milliseconds). Forcing socket close...', DefaultTimeoutPeriod)
                this._socket.terminate()
            }, DefaultTimeoutPeriod)
        }

        let scheduleNextPing = () => {
            pingTimeout = setTimeout(() => {
                if(this._socket && this._socket.readyState === ws.OPEN) {
                    console.log('Relay term sending ping to server. Expecting pong within %d milliseconds', DefaultTimeoutPeriod)
                    this._socket.ping()
                    waitForPongTimeout()
                }
            }, DefaultPingPeriod)
        }

        setTimeout(() => {
            console.log('Connecting to cloud at ' + this.cloudURL)
            this._socket = new ws(this.cloudURL, {
                cert: this.cert,
                key: this.key,
                rejectUnauthorized: false // TODO REMOBE
            })

            this._socket.on('close', (code, reason) => {
                console.log('Relay term tunnel connection disconnected: ', code, reason)
                clearTimeout(pingTimeout)
                clearTimeout(pongTimeout)
                reconnect()
                this.emit('close')
            }).on('error', (error) => {
            }).on('message', (data) => {
                if(typeof data !== 'string') {
                    console.log('Ignoring message. Binary data unsupported', data)

                    return
                }

                let parsedMessageEnvelope

                try {
                    parsedMessageEnvelope = JSON.parse(data)
                }
                catch(error) {
                    console.log('Ignoring message. Data could not be parsed as JSON', data)

                    return
                }

                if(!validate(parsedMessageEnvelope, MessageEnvelopeSchema).valid) {
                    console.log('Ignoring message. Object format invalid', data)

                    return
                }

                if(parsedMessageEnvelope.type == 'input') {
                    this.emit('input', parsedMessageEnvelope.sessionID, parsedMessageEnvelope.payload)
                }
                else if(parsedMessageEnvelope.type == 'resize') {
                    this.emit('resize', parsedMessageEnvelope.sessionID, parsedMessageEnvelope.payload)
                }
                else if(parsedMessageEnvelope.type == 'start') {
                    this.emit('start', parsedMessageEnvelope.sessionID)
                }
                else if(parsedMessageEnvelope.type == 'end') {
                    this.emit('end', parsedMessageEnvelope.sessionID)
                }
            }).on('open', () => {
                console.log('Connected to cloud at ' + this.cloudURL)
                this.reconnectWait = 0
                scheduleNextPing()
                this.emit('open')
            }).on('pong', (data) => {
                console.log('Relay term received pong from server. Resetting pong timeout and scheduling next ping in %d milliseconds', DefaultPingPeriod)
                clearTimeout(pingTimeout)
                clearTimeout(pongTimeout)
                scheduleNextPing()
            })
        }, this.reconnectWait * 1000)
    }
}

module.exports = Tunnel