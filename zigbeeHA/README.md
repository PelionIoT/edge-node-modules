# ZigBee
This module/driver helps in setting up ZigBee network and provides gateway to transmit/receive packets between ZigBee enabled devices. It uses ZigBee certified stack from TI, Z-Stack Home which runs on CC2530 + CC2592 and ZNP host framework which run on host processor.

# Install
```
cp devicejs.json package.json
```
```
npm install
```

# Run
If you are using WigWag relay then this module should be already running. Otherwise modify config.json file as per your zigbee radio requirement and then run the command.
```
cd zigbeeHA
sudo devicejs run ./
```

# Driver commands
##### 1. Add device: 
Start commissioning process. This commnad places the driver in pairing mode (searching for new devices)
```
dev$.selectByID('ZigbeeHA/DevicePairer').call('addDevice').then(function(resp) { if(resp['ZigbeeHA/DevicePairer'] && resp['ZigbeeHA/DevicePairer'].response && !resp['ZigbeeHA/DevicePairer'].response.error) { console.log('Zigbee module is in pairing mode!') } else { console.log('Failed: ', resp['ZigbeeHA/DevicePairer'].response.error) } })
```

##### 2. Get driver state: 
Get zigbee driver state whether it is running or not.
```
dev$.selectByID('ZigbeeDriver').call('getState').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: boolean value, true- running successfully, false- restart the module something went wrong.

##### 3. Get config options: 
List the config options with which the driver was started
```
dev$.selectByID('ZigbeeDriver').call('getConfigOptions').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: config option object

##### 4. Get PAN Id: 
PAN ID of zigbee network. If you need to set PAN ID on end device then set it to the return value of this command.
```
dev$.selectByID('ZigbeeDriver').call('getPanId').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: decimal value

##### 5. Get channel: 
Zigbee network channel. If you need to set channel on end device then set it to the return value of this command.
```
dev$.selectByID('ZigbeeDriver').call('getChannel').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: decimal value

##### 6. Get source address: 
Returns the extended source address of zigbee co-ordinator. That is the MAC address of the co-ordinator/server.
```
dev$.selectByID('ZigbeeDriver').call('getExtendedSrcAddress').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: buffer

##### 7. Get network key: 
Returns the network key used in commissioning process. This key is used for secure communication.
```
dev$.selectByID('ZigbeeDriver').call('getNetworkKey').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: buffer

##### 8. Get network topology: 
This returns the mesh network topology with respect to co-ordinator. This info lets you understand how end devices are meshing in your environment.
```
dev$.selectByID('ZigbeeDriver').call('getNetworkTopology').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: Object with network topology where COORDINATOR- server, ROUTER and ENDPOINT- devices

##### 9. Ping: 
This command explicitly ping all the nodes in the network and updates the network topology. 
```
dev$.selectByID('ZigbeeDriver').call('ping').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: Object with network topology where COORDINATOR- server, ROUTER and ENDPOINT- devices

##### 10. Device status: 
This command returns the life status of the devices. If the devices are switched off or not reachable it will be stated as 'dead' otherwise 'alive'. If driver looses communication for sometime it will be reported as 'may be dead'.
```
dev$.selectByID('ZigbeeDriver').call('status').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: Object with device short address as key with status and resourceID as value.

##### 11. Get onboarded nodes: 
Get all the nodes information registered with this driver during its runtime.
```
dev$.selectByID('ZigbeeDriver').call('getNodes').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: Object with device short address as key

##### 12. Log level: 
To increase/decrease logging. Available- error- 0, warn- 1, info- 2, debug- 3, trace- 4
```
dev$.selectByID('ZigbeeDriver').call('logLevel', 3).then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```

##### 13. Get extended PAN Id: 
Returns the extended PAN Id of zigbee co-ordinator.
```
dev$.selectByID('ZigbeeDriver').call('getExtendedPanId').then(function(resp) { if(resp.ZigbeeDriver && resp.ZigbeeDriver.response && resp.ZigbeeDriver.response.result) { console.log(resp.ZigbeeDriver.response.result) } else { console.log('Failed: ', resp.ZigbeeDriver.response.error) } })
```
Returns: buffer

# References: 
[API Documentation](https://code.wigwag.com/doc/ZigBeeAPIDocumentation_v1.0/)
