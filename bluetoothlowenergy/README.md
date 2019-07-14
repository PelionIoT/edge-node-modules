# Bluetooth Low Energy
This deviceJS module helps interact with Bluetooth/BLE end devices

## Dependencies
Install devicejs and devicedb and make sure that is running on your machine. Also install the prerequisites of [noble](https://github.com/noble/noble)


## Install
```
cp devicejs.json package.json
```
```
npm install
```

## Run
In super user mode. Provide the HCI device ID if it is other than 0 -
```
NOBLE_HCI_DEVICE_ID=1 devicejs run ./
```

## Useful commands

In devicejs shell run the following -

1. Discover new BLE devices

```
dev$.selectByID('BluetoothDriver').set("startScan")
```

2. List discovered devices

```
dev$.selectByID('BluetoothDriver').get("peripherals").then(function(a) { console.log(JSON.parse(a.BluetoothDriver.response.result)) })

{ '262e07148ccc': 
   { id: '262e07148ccc',
     uuid: '262e07148ccc',
     address: '26:2e:07:14:8c:cc',
     addressType: 'random',
     connectable: false,
     advertisement: 
      { manufacturerData: [Object],
        serviceData: [],
        serviceUuids: [],
        solicitationServiceUuids: [],
        serviceSolicitationUuids: [] },
     rssi: -79,
     services: null,
     state: 'disconnected',
     supported: false },
  '30f7723646c2': 
   { id: '30f7723646c2',
     uuid: '30f7723646c2',
     address: '30:f7:72:36:46:c2',
     addressType: 'public',
     connectable: true,
     advertisement: 
      { serviceData: [],
        serviceUuids: [Array],
        solicitationServiceUuids: [],
        serviceSolicitationUuids: [] },
     rssi: -64,
     services: null,
     state: 'disconnected',
     supported: false },
```

3. Onboard/Connect with BLE device

Pass in the discovered device's uuid

```
dev$.selectByID('BluetoothDriver').set("addDevice", "c986aac44698")

{ BluetoothDriver: { receivedResponse: true, response: { error: null } } }
```

4. List all state values of a BLE device

Example
```
dev$.selectByID('BLE_Thingy_c986aac44698').get().then(function(a) { console.log(a.BLE_Thingy_c986aac44698.response) })

{ result: 
   { temperature: 26.61,
     humidity: 54,
     co2: 0,
     tvoc: 0,
     color: { red: 0, green: 0, blue: 0, clear: 0 },
     pressure: 0,
     button: true,
     quaternion: { w: 0, x: 0, y: 0, z: 0 },
     euler: { roll: 0, pitch: 0, yaw: 0 },
     heading: 0,
     gyroscope: { x: 0, y: 0, z: 0 },
     accelerometer: { x: 0, y: 0, z: 0 },
     gravity: { x: 0, y: 0, z: 0 },
     rotation: 
      { m_11: 0,
        m_12: 0,
        m_13: 0,
        m_21: 0,
        m_22: 0,
        m_23: 0,
        m_31: 0,
        m_32: 0,
        m_33: 0 },
     rgb: { mode: 'constant', data: [Object] },
     subscribe: 
      { temperature: true,
        pressure: false,
        humidity: true,
        co2: true,
        color: false,
        button: true,
        tap: true,
        orientation: true,
        quaternion: false,
        stepcounter: true,
        euler: false,
        heading: false,
        accelerometer: false,
        gravity: false,
        rotation: false },
     rssi: -48,
     battery: 77 },
  error: null }

```
