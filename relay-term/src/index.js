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

const process = require('process')

let Commands = {
    start: require('./commands/start').execute,
    conf: require('./commands/conf').execute,
    help: require('./commands/help').execute
}

let printUsage = () => {
    console.error('Usage: relay-term [ command [arguments] ] -version')
    console.error()
    console.error()
    console.error('Commands:')
    console.error('    start  Start the relay-term service')
    console.error('    conf   Generate a template configuration file')
    console.error()
    console.error('Use relay-term help [command] for more usage information about a command.')
}

let run = () => {
    let command = process.argv[2]

    if(!Commands.hasOwnProperty(command)) {
        printUsage()

        process.exit(1)
    }

    Commands[command].apply(null, process.argv.slice(3))
}

run()