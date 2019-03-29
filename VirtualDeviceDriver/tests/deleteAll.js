dev$.selectByID('VirtualDeviceDriver').call('deleteAll').then(function(resp) {
    console.log('Response ' + JSON.stringify(resp));
    process.exit(0);
})