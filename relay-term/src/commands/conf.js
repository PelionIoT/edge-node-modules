'use strict'

module.exports = {
    usage: () => {
        console.error('Usage: relay-term conf > out.json')
    },
    execute: () => {
        console.log('{')
        console.log('    "cloud": "wss://cloud.wigwag.io",')
        console.log('    "certificate": "/wigwag/certs/client.cert.pem",')
        console.log('    "key": "/wigwag/certs/client.key.pem"')
        console.log('}')
    }
}