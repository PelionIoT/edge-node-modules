# Virtual Device Driver
This deviceJS module/driver helps you simulate different types of device controllers like contact sensor, motion sensor, humidity sensor, light bulb etc.

# Install
```
cp devicejs.json package.json
```
```
npm install
```

# Available virtual device templates
You can view the available device controller definitions in template directory. You can add new definitions to template directory and run register command to update the driver with new device controllers.

1. Thermostat
2. VibrationSensor
3. WaterLeak
4. Temperature
5. SmokeAlarm
6. Luminance
7. MotionSensor
8. Regulator
9. HumiditySensor
10. LightBulb
11. Flipflop
12. DoorLock
13. ContactSensor
14. Button
15. Battery


# Driver Commands

##### 1. List Templates:
List available virtual devices templates
```
dev$.selectByID('VirtualDeviceDriver').call('listTemplates').then(function(resp) { if(resp.VirtualDeviceDriver && resp.VirtualDeviceDriver.response && resp.VirtualDeviceDriver.response.result) { console.log(resp.VirtualDeviceDriver.response.result) } else { console.log('Failed: ', resp.VirtualDeviceDriver.response.error) } })
```

##### 2. Create:
Create new device controller from available templates. It returns the resourceID on which new device controller is created.
```
dev$.selectByID('VirtualDeviceDriver').call('create', 'ContactSensor').then(function(resp) { if(resp.VirtualDeviceDriver && resp.VirtualDeviceDriver.response && resp.VirtualDeviceDriver.response.result) { console.log(resp.VirtualDeviceDriver.response.result) } else { console.log('Failed: ', resp.VirtualDeviceDriver.response.error) } })
```
Result: Started controller with id VirtualContactSensor0

##### 3. List Resources:
List created virtual device controller's resourceIDs
```
dev$.selectByID('VirtualDeviceDriver').call('listResources').then(function(resp) { if(resp.VirtualDeviceDriver && resp.VirtualDeviceDriver.response && resp.VirtualDeviceDriver.response.result) { console.log(resp.VirtualDeviceDriver.response.result) } else { console.log('Failed: ', resp.VirtualDeviceDriver.response.error) } })
```
Result: [ 'VirtualContactSensor0' ]

##### 4. Stop:
To stop running device controller. It takes valid resourceID as argument.
```
dev$.selectByID('VirtualDeviceDriver').call('stop', 'VirtualContactSensor0').then(function(resp) { if(resp.VirtualDeviceDriver && resp.VirtualDeviceDriver.response && resp.VirtualDeviceDriver.response.result) { console.log(resp.VirtualDeviceDriver.response.result) } else { console.log('Failed: ', resp.VirtualDeviceDriver.response.error) } })
```
Result: Successfully stoped VirtualContactSensor0

##### 5. Delete:
To stop and forget a virtual device controller.
```
dev$.selectByID('VirtualDeviceDriver').call('delete', 'VirtualContactSensor0').then(function(resp) { if(resp.VirtualDeviceDriver && resp.VirtualDeviceDriver.response && resp.VirtualDeviceDriver.response.result) { console.log(resp.VirtualDeviceDriver.response.result) } else { console.log('Failed: ', resp.VirtualDeviceDriver.response.error) } })
```
Result: Deleted successfully VirtualContactSensor0

##### 6. DeleteAll:
Deletes all the virtual device controllers
```
dev$.selectByID('VirtualDeviceDriver').call('deleteAll').then(function(resp) { if(resp.VirtualDeviceDriver && resp.VirtualDeviceDriver.response && resp.VirtualDeviceDriver.response.result) { console.log(resp.VirtualDeviceDriver.response.result) } else { console.log('Failed: ', resp.VirtualDeviceDriver.response.error) } })
```
Result: Deleted all successfully

##### 7. Register:
To register new or update old device controllers. Place new device controller definitions in template directory and run this command to update the virtual device controller.
```
dev$.selectByID('VirtualDeviceDriver').call('register').then(function(resp) { if(resp.VirtualDeviceDriver && resp.VirtualDeviceDriver.response && resp.VirtualDeviceDriver.response.result) { console.log(resp.VirtualDeviceDriver.response.result) } else { console.log('Failed: ', resp.VirtualDeviceDriver.response.error) } })
```
Result: Successfully registered templates- ContactSensor,HumiditySensor,LightBulb,MotionSensor

##### 8. Log Level:
To increase/decrease logging. Available- error- 0, warn- 1, info- 2, debug- 3, trace- 4
```
dev$.selectByID('VirtualDeviceDriver').call('logLevel', 3).then(function(resp) { if(resp.VirtualDeviceDriver && resp.VirtualDeviceDriver.response && resp.VirtualDeviceDriver.response.result) { console.log(resp.VirtualDeviceDriver.response.result) } else { console.log('Failed: ', resp.VirtualDeviceDriver.response.error) } })
```


# Device Controller Commands
Supports standard device controller state(get/set) and command calls + following command.

##### Emit: This command is supported by all device controllers whose interfaces (facades) has defined events.
This command make device controller emit an event under implemented interface schema format.

Explicit Event- Emits the event data which is passed as argument.
```
dev$.selectByID('VirtualContactSensor0').call('emit', true)
```

Implicit Event- Emits random event data
```
dev$.selectByID('VirtualContactSensor0').call('emit')
```

More information: Go through core-interfaces/facades in devicejs-core-modules to know more about the interfaces supported by device controllers. To know more about the virtaul device definitions, read through templates directory.

# Logs
```
tail -f devicejs.log | grep 'VirtualDevice'
```
