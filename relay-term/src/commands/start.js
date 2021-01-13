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
const pty = require('node-pty')
const fs = require('fs')
const process = require('process')
const path = require('path')
const Tunnel = require('../tunnel')

const RelayTermConfigSchema = {
    type: 'object',
    properties: {
        cloud: {
            type: 'string'
        },
        noValidate: {
            type: 'boolean'
        },
        certificate: {
            type: 'string'
        },
        key: {
            type: 'string'
        }
    },
    required: [ 'cloud', 'certificate', 'key' ]
}

let loadConfig = (configFile) => {
    let configString
    let parsedConfig

    try {
        configString = fs.readFileSync(configFile, 'utf8')
    }
    catch(error) {
        throw new Error('Unable to read from config file at: '  + configFile)
    }

    try {
        parsedConfig = JSON.parse(configString)
    }
    catch(error) {
        throw new Error('Config file is not properly formatted')
    }

    if(!validate(parsedConfig, RelayTermConfigSchema).valid) {
        throw new Error('Config file is not properly formatted')
    }

    try {
        if(parsedConfig.certificate) {
            parsedConfig.certificate = fs.readFileSync(path.resolve(configFile, parsedConfig.certificate), 'utf8')
        }
    }
    catch(error) {
        throw new Error('Unable to read TLS certificate file at: ' + path.resolve(configFile, parsedConfig.certificate))
    }

    try {
        if(parsedConfig.key) {
            parsedConfig.key = fs.readFileSync(path.resolve(configFile, parsedConfig.key), 'utf8')
        }
    }
    catch(error) {
        throw new Error('Unable to read TLS key file at: ' + path.resolve(configFile, parsedConfig.key))
    }

    parsedConfig.noValidate = !!parsedConfig.noValidate

    return parsedConfig
}

let usage = () => {
    console.error('Usage: relay-term start [config file]')
}

let execute = (configFile) => {
    if(typeof configFile !== 'string') {
        usage()

        return
    }

    let config

    try {
        config = loadConfig(configFile)
    }
    catch(error) {
        console.log(error.stack)
        console.error(error.message)

        process.exit(1)
    }

    let sessions = new Map()
    let t = new Tunnel({
        cloudURL: config.cloud,
        cert: config.certificate,
        key: config.key,
        noValidate: config.noValidate
    })


    t.on('close', () => {
        for(let sessionID of sessions.keys()) {
            sessions.get(sessionID).destroy()
        }

        sessions.clear()
    }).on('start', (sessionID) => {
        let term = pty.spawn('bash', [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env
        })

        term.on('data', (data) => {
            t.send(sessionID, data)
        }).on('exit', () => {
            sessions.delete(sessionID)
            console.log('Terminal ' + sessionID + ' exited. Notifying cloud that this session is terminated...')
            term.destroy()
            t.end(sessionID)
        })

        sessions.set(sessionID, term)
        console.log('New session. Terminal ' + sessionID + ' created.')
    }).on('end', (sessionID) => {
        if(sessions.has(sessionID)) {
            sessions.get(sessionID).removeAllListeners('exit')
            sessions.get(sessionID).destroy()
            console.log('Session ended. Killing terminal ' + sessionID)
            sessions.delete(sessionID)
        }
    }).on('input', (sessionID, data) => {
        if(sessions.has(sessionID)) {
            sessions.get(sessionID).write(data)
        }
    }).on('resize', (sessionID, dimensions) => {
        console.log('Resize terminal ' + sessionID, dimensions)

        if(sessions.has(sessionID)) {
            sessions.get(sessionID).resize(dimensions.width, dimensions.height)
        }
    })
}

module.exports = {
    execute: execute,
    usage: usage
}
