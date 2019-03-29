dev$.selectByID('VirtualDeviceDriver').call('listResources').then(function(resp) {
    var deviceIds = resp.VirtualDeviceDriver.response.result;
    deviceIds.forEach(function(id, index) {
        dev$.selectByID(id).get().then(function(resp) {
            console.log(index + ': Got state for device ' + id + ' state ' + JSON.stringify(resp[id].response.result));
            dev$.selectByID(id).set(resp[id].response.result).then(function(r) {
                console.log('\tSet success for device ' + id + ' response ' + JSON.stringify(r[id].response.result));
            });
        });
    });
});