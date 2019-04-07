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

let Commands

let ex = {
    usage: () => {
        console.error('Usage: relay-term help [command]')
    },
    execute: (command) => {
        if(!Commands.hasOwnProperty(command)) {
            console.error('No such command')

            process.exit(1)
        }

        Commands[command]()
    }
}

Commands = {
    conf: require('./conf').usage,
    help: ex.usage,
    start: require('./start').usage
}

module.exports = ex