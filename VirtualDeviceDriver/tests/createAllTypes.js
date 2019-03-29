dev$.selectByID('VirtualDeviceDriver').call('listTemplates').then(function(a) {
    var templates = a.VirtualDeviceDriver.response.result;
    console.log('Got number of template controllers ' + templates.length + ' templates ' + JSON.stringify(templates));
    templates.forEach(function(type, index, array) {
        dev$.selectByID('VirtualDeviceDriver').call('create', type).then(function(resp) {
            console.log(index + ': Created type ' + type + ' response ' + JSON.stringify(resp));
        });
    });
});