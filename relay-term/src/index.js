'use strict'

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