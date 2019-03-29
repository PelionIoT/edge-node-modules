'use strict'

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