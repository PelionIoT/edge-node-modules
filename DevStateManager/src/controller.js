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
var fs = require('fs');
var jsonminify = require('jsonminify');
var Logger = require('./../utils/logger');
var logger = new Logger({
    moduleName: 'Controller',
    color: 'bgBlue'
});

var VALID_DEVICE_NAME_REGEX = /^[^\/]+((\/[^\/]+)+)?$/;


var resourceTypeGlyph= {
    "Core/Devices/Lighting/Generic_Controller":                                    "&#x2b1f",
    "Core/Devices/Lighting/Greenwave/GreenwaveBulb":                               "&#x2b0b",
    "Core/Devices/Lighting/Insteon/6Button":                                       "&#x2b2e",
    "Core/Devices/Lighting/Insteon/8Button":                                       "&#x2b2f",
    "Core/Devices/Lighting/Insteon/Bulb":                                          "&#x2b0b",
    "Core/Devices/Lighting/Insteon/DimmerModule":                                  "&#x0050",
    "Core/Devices/Lighting/Insteon/DimmerOutlet":                                  "&#x2afd",
    "Core/Devices/Lighting/Insteon/MicroDimmer":                                   "&#x2b4c",
    "Core/Devices/Lighting/Insteon/MicroSwitch":                                   "&#x0070",
    "Core/Devices/Lighting/Insteon/OutdoorDimmer":                                 "&#x2b35",
    "Core/Devices/Lighting/Insteon/PaddleDimmer":                                  "&#x2b2d",
    "Core/Devices/Lighting/Insteon/RecessedBulb":                                  "&#x2b11",
    "Core/Devices/Lighting/Insteon/RelaySwitch":                                   "&#x0067",
    "Core/Devices/Lighting/Insteon/ToggleDimmer":                                  "&#x005b",
    "Core/Devices/Lighting/LIFX/Color1000":                                        "&#x2b0c",
    "Core/Devices/Lighting/LIFX/Original":                                         "&#x2b0c",
    "Core/Devices/Lighting/LIFX/White800":                                         "&#x2b0c",
    "Core/Devices/Lighting/LIFX/White900BR30":                                     "&#x2b0c",
    "Core/Devices/Lighting/PhilipsHue/HueDownlight":                               "&#x2b10",
    "Core/Devices/Lighting/PhilipsHue/HueLux":                                     "&#x2b10",
    "Core/Devices/Lighting/PhilipsHue/HueStandard":                                "&#x2b10",
    "Core/Devices/Lighting/WeMo/BinarySwitch":                                     "&#x2b0f",
    "Core/Devices/Lighting/WigwagDevices/DataBank":                                "&#x2750",
    "Core/Devices/Lighting/WigwagDevices/Filament":                                "&#x0062",
    "Core/Devices/Lighting/WigwagDevices/GlobalDummyPanelLighting":                "&#x2750",
    "Core/Devices/Lighting/WigwagDevices/PanelLighting":                           "&#x2750",
    "Core/Devices/Lighting/ZigbeeHA/CentraLite_4257050_RZHAC":                     "&#x2b0e",
    "Core/Devices/Lighting/ZigbeeHA/CREE_Connected_A19_60W_Equivalent":            "&#x2b09",
    "Core/Devices/Lighting/ZigbeeHA/GE_Appliances_ZLL_Light":                      "&#x2b0b",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_A19_Tunable_White":             "&#x2b0b",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_A19_ON_OFF_DIM":                "&#x2b0b",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_BR_Tunable_White":              "&#x2b11",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_Flex_RGBW":                     "&#x00ac",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_Gardenspot_RGB":                "&#x00ac",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_RT_RGBW":                       "&#x2b54",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_RT_Tunable_White":              "&#x2b54",
    "Core/Devices/Lighting/ZigbeeHA/Philips_LWB006":                               "&#x2b0b",
    "Core/Devices/Lighting/ZigbeeHA/Quirky_Smart_Switch":                          "&#x2b2b",
    "Core/Devices/Lighting/ZigbeeHA/WEMO_MRVL_MZ100":                              "&#x2b0b",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_8000_SERIES":                         "&#x0074",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_254_160":                             "&#x0074",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_254_10":                              "&#x0074",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_012-160":                             "&#x0074",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_013_01":                              "&#x0074",
    "Core/Devices/Lighting/Zwave/AeonLabs0006_Smart_Energy_Switch":                "&#x2b37",
    "Core/Devices/Lighting/Zwave/Aeonlabs0009_Energy_Reader":                      "&#x2b3b",
    "Core/Devices/Lighting/Zwave/Fibaro2001_Motion_Light_Temperature_Sensor":      "&#x2b34",
    "Core/Devices/Lighting/Zwave/FirstAlert0002_Smoke_Detector":                   "&#x2b53",
    "Core/Devices/Lighting/Zwave/GE3031_Binary_Power_Switch":                      "&#x2b0e",
    "Core/Devices/Lighting/Zwave/GE3032_Binary_Power_Switch":                      "&#x2b0e",
    "Core/Devices/Lighting/Zwave/GE3130_Outdoor_Outlet":                           "&#x2b32",
    "Core/Devices/Lighting/Zwave/GE3031_Outdoor_Outlet":                           "&#x2b32",
    "Core/Devices/Lighting/Zwave/Generic0000_WigWag_Autogen_Controller_nodeid_21": "&#x2b0e",
    "Core/Devices/Lighting/Zwave/Honeywell0001_Touchscreen_Thermostat":            "&#x0074",
    "Core/Devices/Lighting/Zwave/Leviton0334_Binary_Scene_Switch":                 "&#x2b0e",
    "Core/Devices/Lighting/Zwave/Leviton0334_Multilevel_Scence_Switch":            "&#x2b0e",
    "Core/Devices/Lighting/Zwave/Leviton1b03_Multilevel_Scence_Switch":            "&#x2b65",
    "Core/Devices/Lighting/Zwave/Linear0102_Routing_Binary_Sensor":                "&#x00aa",
    "Core/Devices/Lighting/Zwave/Linear0203_Routing_Binary_Sensor":                "&#x00aa",
    "Core/Devices/Lighting/Zwave/Linear3034_Multilevel_Scence_Switch":             "&#x201c",
    "Core/Devices/Lighting/Zwave/Linear3530_Binary_Scene_Switch":                  "&#x201c",
    "Core/Devices/Lighting/Zwave/Linearlinc3038_SmartLED_LightBulb":               "&#x2b0b",
    "Core/Devices/Lighting/Zwave/Schlage504c_Keypad_Door_Lock":                    "&#x2b43",
    "Core/Devices/Lighting/Zwave/Unknown0001_Routing_Binary_Sensor":               "&#x00aa",
    "Core/Devices/Lighting/Zwave/Unknown0003_Routing_Binary_Sensor":               "&#x00aa",
    "Core/Devices/Lighting/Zwave/Unknown0603_Binary_Power_Switch":                 "&#x2b0e",
    "Core/Devices/Lighting/Zwave/Utilitech0001_Water_Leak_Detector":               "&#x2b3c",
    "Core/Devices/Lighting/Zwave/Vision0102_Routing_Binary_Sensor":                "&#x00aa",
    "Core/Devices/Lighting/Zwave/Vision0106_Routing_Binary_Sensor":                "&#x00aa",
    "Core/Devices/Lighting/Zwave/Vision0203_Routing_Binary_Sensor":                "&#x00aa",
    "Core/Devices/Lighting/Zwave/Vision0203_Motion_Sensor":                        "&#x00fe",
    "Core/Devices/Lighting/Zwave/Vision0302_Shock_Vibration_Sensor":               "&#x2019",
    "Core/Devices/Lighting/Zwave/Vision0403_Smoke_Detector":                       "&#x2b53",
    "Core/Devices/Lighting/Zwave/AeonLabs0003_Remote_Control":                     "&#x2b1f",
    "Core/Devices/Lighting/Zwave/Everspring0001_Temperature_Humidity":             "&#x00e4",
    "Core/Devices/Lighting/Zwave/Vision0621_Electronic_DeadBolt_Door_Lock":        "&#x2b56",
    "Core/Devices/Lighting/Zwave/Vision0703_Binary_Power_Switch":                  "&#x2b0e",
    "Core/Devices/Lighting/Zwave/Vision0803_Multilevel_Power_Switch":              "&#x2b0e",
    "Core/Devices/Lighting/Zwave/Vision0a02_Garage_Door_Detector":                 "&#x00aa",
    "Core/Devices/Sonos":                                                          "&#x007b"
};

var stageName = {
    "Core/Devices/SmartDevice":                                                     "Smart Device",
    "Core/Devices/Lighting/Generic_Controller":                                     "Z-Wave Device",
    "Core/Devices/Lighting/Greenwave/GreenwaveBulb":                                "TCP Bulb",
    "Core/Devices/Lighting/Insteon/6Button":                                        "Insteon 6Button",
    "Core/Devices/Lighting/Insteon/8Button":                                        "Insteon 8Button",
    "Core/Devices/Lighting/Insteon/Bulb":                                           "Insteon Bulb",
    "Core/Devices/Lighting/Insteon/DimmerModule":                                   "Insteon Dimmer",
    "Core/Devices/Lighting/Insteon/DimmerOutlet":                                   "Insteon Outlet",
    "Core/Devices/Lighting/Insteon/MicroDimmer":                                    "Insteon MicroDimmer",
    "Core/Devices/Lighting/Insteon/MicroSwitch":                                    "Insteon Switch",
    "Core/Devices/Lighting/Insteon/OutdoorDimmer":                                  "Insteon Outdoor",
    "Core/Devices/Lighting/Insteon/PaddleDimmer":                                   "Insteon Paddle",
    "Core/Devices/Lighting/Insteon/RecessedBulb":                                   "Insteon RecessedBulb",
    "Core/Devices/Lighting/Insteon/RelaySwitch":                                    "Insteon Switch",
    "Core/Devices/Lighting/Insteon/ToggleDimmer":                                   "Insteon ToggleDimmer",
    "Core/Devices/Lighting/LIFX/Color1000":                                         "LIFX Color Bulb",
    "Core/Devices/Lighting/LIFX/Original":                                          "LIFX Original Bulb",
    "Core/Devices/Lighting/LIFX/White800":                                          "LIFX White Bulb",
    "Core/Devices/Lighting/LIFX/White900BR30":                                      "LIFX WhiteBR Bulb",
    "Core/Devices/Lighting/PhilipsHue/HueDownlight":                                "Hue DownLight",
    "Core/Devices/Lighting/PhilipsHue/HueLux":                                      "Hue LuxBulb",
    "Core/Devices/Lighting/PhilipsHue/HueStandard":                                 "Hue Standard Bulb",
    "Core/Devices/Lighting/WeMo/BinarySwitch":                                      "Wemo Binary Switch",
    "Core/Devices/Lighting/WigwagDevices/Filament":                                 "Filament",
    "Core/Devices/Lighting/WigwagDevices/PanelLighting":                            "Panel Light",
    "Core/Devices/Lighting/ZigbeeHA/CentraLite_4257050_RZHAC":                      "Centralite HVAC",
    "Core/Devices/Lighting/ZigbeeHA/CREE_Connected_A19_60W_Equivalent":             "Cree Bulb",
    "Core/Devices/Lighting/ZigbeeHA/GE_Appliances_ZLL_Light":                       "GE Light Link",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_A19_Tunable_White":              "OSRAM A19White Bulb",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_A19_ON_OFF_DIM":                 "OSRAM A19ONOFFDIM Bulb",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_BR_Tunable_White":               "OSRAM WhiteBR Bulb",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_Flex_RGBW":                      "OSRAM Flex",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_Gardenspot_RGB":                 "OSRAM Garden",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_RT_RGBW":                        "OSRAM RGBW Bulb",
    "Core/Devices/Lighting/ZigbeeHA/OSRAM_LIGHTIFY_RT_Tunable_White":               "OSRAM Tunable Bulb",
    "Core/Devices/Lighting/ZigbeeHA/Philips_LWB006":                                "Philips Bulb",
    "Core/Devices/Lighting/ZigbeeHA/Quirky_Smart_Switch":                           "Quirky Switch",
    "Core/Devices/Lighting/ZigbeeHA/WEMO_MRVL_MZ100":                               "Wemo Bulb",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_8000_SERIES":                          "Viconics Thermostat",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_254_160":                              "Viconics Thermostat",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_254_10":                               "Viconics Thermostat",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_012-160":                              "Viconics Thermostat",
    "Core/Devices/Lighting/ZigbeeHA/Viconics_013_01":                               "Viconics Thermostat",
    "Core/Devices/Lighting/Zwave/AeonLabs0006_Smart_Energy_Switch":                 "Aeon Smart Switch",
    "Core/Devices/Lighting/Zwave/Aeonlabs0009_Energy_Reader":                       "Aeon Energy Reader",
    "Core/Devices/Lighting/Zwave/Fibaro2001_Motion_Light_Temperature_Sensor":       "Fibaro Motion Sensor",
    "Core/Devices/Lighting/Zwave/FirstAlert0002_Smoke_Detector":                    "FA Smoke Detector",
    "Core/Devices/Lighting/Zwave/GE3031_Binary_Power_Switch":                       "GE Switch",
    "Core/Devices/Lighting/Zwave/GE3032_Binary_Power_Switch":                       "GE Switch",
    "Core/Devices/Lighting/Zwave/GE3130_Outdoor_Outlet":                            "GE Outdoor Outlet",
    "Core/Devices/Lighting/Zwave/GE3031_Outdoor_Outlet":                            "GE Outdoor Outlet",
    "Core/Devices/Lighting/Zwave/Generic0000_WigWag_Autogen_Controller_nodeid_21":  "Z-Wave Device",
    "Core/Devices/Lighting/Zwave/Honeywell0001_Touchscreen_Thermostat":             "Honeywell Thermostat",
    "Core/Devices/Lighting/Zwave/Leviton0334_Binary_Scene_Switch":                  "Leviton Switch",
    "Core/Devices/Lighting/Zwave/Leviton0334_Multilevel_Scence_Switch":             "Leviton MultiSwitch",
    "Core/Devices/Lighting/Zwave/Leviton1b03_Multilevel_Scence_Switch":             "Leviton SceneSwitch",
    "Core/Devices/Lighting/Zwave/Linear0102_Routing_Binary_Sensor":                 "Linear Door/Window",
    "Core/Devices/Lighting/Zwave/Linear0203_Routing_Binary_Sensor":                 "Linear Door/Window",
    "Core/Devices/Lighting/Zwave/Linear3034_Multilevel_Scence_Switch":              "Linear Scene Switch",
    "Core/Devices/Lighting/Zwave/Linear3530_Binary_Scene_Switch":                   "Linear Binary Switch",
    "Core/Devices/Lighting/Zwave/Linearlinc3038_SmartLED_LightBulb":                "Linear LED Bulb",
    "Core/Devices/Lighting/Zwave/Schlage504c_Keypad_Door_Lock":                     "Schlage Keypad Lock",
    "Core/Devices/Lighting/Zwave/Unknown0001_Routing_Binary_Sensor":                "Door/Window Sensor",
    "Core/Devices/Lighting/Zwave/Unknown0003_Routing_Binary_Sensor":                "Door/Window Sensor",
    "Core/Devices/Lighting/Zwave/Unknown0603_Binary_Power_Switch":                  "Binary Power Switch",
    "Core/Devices/Lighting/Zwave/Utilitech0001_Water_Leak_Detector":                "Water Leak Detector",
    "Core/Devices/Lighting/Zwave/Vision0102_Routing_Binary_Sensor":                 "Vision Door/Window",
    "Core/Devices/Lighting/Zwave/Vision0106_Routing_Binary_Sensor":                 "Vision Door/Window",
    "Core/Devices/Lighting/Zwave/Vision0203_Routing_Binary_Sensor":                 "Vision Motion",
    "Core/Devices/Lighting/Zwave/Vision0302_Shock_Vibration_Sensor":                "Vision Shock",
    "Core/Devices/Lighting/Zwave/Vision0203_Motion_Sensor":                         "Vision Motion",
    "Core/Devices/Lighting/Zwave/Vision0403_Smoke_Detector":                        "Vision Smoke",
    "Core/Devices/Lighting/Zwave/Vision0621_Electronic_DeadBolt_Door_Lock":         "Vision DoorLock",
    "Core/Devices/Lighting/Zwave/AeonLabs0003_Remote_Control":                      "Remote Control",
    "Core/Devices/Lighting/Zwave/Everspring0001_Temperature_Humidity":              "Temp/Humid Sensor",
    "Core/Devices/Lighting/Zwave/Vision0703_Binary_Power_Switch":                   "Vision Binary Switch",
    "Core/Devices/Lighting/Zwave/Vision0803_Multilevel_Power_Switch":               "Vision MultiSwitch",
    "Core/Devices/Lighting/Zwave/Vision0a02_Garage_Door_Detector":                  "Vision Garage",
    "Core/Devices/Sonos":                                                           "Sonos",
    "Core/Devices/Enocean":                                                         "Enocean Device",
    "Core/Devices/ModbusRTU":                                                       "Modbus Device"
};

var facadeWeights = {
    0x0001: ['Facades/Switchable', 'Facades/Dimmable', 'Facades/Button' ], //Cant differentiate between bulb and outlet
    0x0002: ['Facades/Colorable', 'Facades/hasWhiteTemp' ],
    0x0004: ['Facades/HasMotion'],
    0x0008: ['Facades/HasVibration', "Facades/HasTamper"],
    0x0010: ['Facades/HasTemperature'],
    0x0020: ["Facades/AutoTemperatureLevel", "Facades/CoolTemperatureLevel", "Facades/HeatTemperatureLevel", "Facades/OccupiedAutoTemperatureLevel",
                "Facades/OccupiedCoolTemperatureLevel", "Facades/OccupiedHeatTemperatureLevel", "Facades/UnoccupiedAutoTemperatureLevel",
                "Facades/UnoccupiedCoolTemperatureLevel", "Facades/UnoccupiedHeatTemperatureLevel", "Facades/ThermostatDeadband",
                "Facades/ThermostatFanMode", "Facades/ThermostatMode", "Facades/ThermostatUserInterface", "Facades/SetTemperatureLevel"], //Thermostat
    0x0040: ["Facades/Button"],
    0x0080: ["Facades/HasContact"],
    0x0100: ["Facades/HasLock"],
    0x0200: ["Facades/HasLuminance"],
    0x0400: ["Facades/HasSmokeAlarm"],
    0x0800: ["Facades/HasWaterLeakDetector"],
    0x1000: ["Facades/Humidity"],
    0x2000: ["Facades/Playable"],
    0x4000: ["Facades/Ultraviolet"],
    0x8000: ['Facades/HasMotion', 'Facades/HasVibration', 'Facades/HasTemperature', "Facades/HasContact",
            "Facades/HasLuminance", "Facades/HasSmokeAlarm", "Facades/HasWaterLeakDetector", "Facades/Humidity", "Facades/Ultraviolet"], //Multi-sensor
    0x10000: ["Facades/Regulator"],
    0x20000: ["Facades/Flipflop"],
    0x40000: ["Facades/MediaStream"]
};

var facadePostfixNameBitMap = {
    0x0001: "Switch",
    0x0002: "Bulb",
    0x0004: "Motion Sensor",
    0x0008: "Vibration Sensor",
    0x0010: "Temperature Sensor",
    0x0020: "Thermostat",
    0x0040: "Button",
    0x0080: "Contact Sensor",
    0x0100: "Lock",
    0x0200: "Luminance Sensor",
    0x0400: "Smoke Alarm",
    0x0800: "Water Leak Detector",
    0x1000: "Humidity Sensor",
    0x2000: "Speaker",
    0x4000: "Ultraviolet Sensor",
    0x8000: "Multi Sensor",
    0x10000: "Regulator",
    0x20000: "Indicator",
    0x40000: "Video Camera"
};

var facadeGlyphBitMap = {
    0x0001: "&#x0070",
    0x0002: "&#x2b09",
    0x0004: "&#x004d",
    0x0008: "&#x004c",
    0x0010: "&#x0074",
    0x0020: "&#x0074",
    0x0040: "&#x2b66",
    0x0080: "&#x00aa",
    0x0100: "&#x2b56",
    0x0200: "&#x0030",
    0x0400: "&#x2b53",
    0x0800: "&#x2b3c",
    0x1000: "&#x00ae",
    0x2000: "&#x007b",
    0x4000: "&#x00e5",
    0x8000: "&#x007c",
    0x10000: "&#x0064",
    0x20000: "&#x0067",
    0x40000: "&#x003e"
};

function isDeviceInterface(value) {
    return (value.indexOf('Facades') != -1);
}

var DevStateManager = {
    start: function(obj) {
        logger.info('Starting controller');
        var self = this;
        this._defaultPollingRate = obj.defaultPollingRate;
        this._pollingResolution = obj.pollingResolution;
        this._maxPollingCycles = obj.maxPollingCycles;
        this._devInterfaces = obj.interfaces;
        this._devStates = {};
        this._numberOfDevicesPerProtocol = {
            "Modbus": 0,
            "Bacnet": 0,
            "6LoWPAN": 0,
            "ZigBee": 0,
            "Virtual": 0,
            "Z-Wave": 0
        };
        this._pollingSchemes = obj.pollingSchemes;
        this._stageName = stageName;
        this._resourceGlyph = resourceTypeGlyph;
        this._isPolling = false;
        this._id = obj.resourceID;

        this._devices = {};

        this.allEvents = dev$.select('id=*');
        this.allEvents.subscribeToEvent('+');
        this.allEvents.on('event', function(id, type, data) {
            if (id !== 'DevStateManager') {
                if (type !== 'register' &&
                    type !== 'discovery' &&
                    type !== 'zigbeePairingProgress' &&
                    type.indexOf('Pairer') == -1) {
                    if (type == 'reachable') {
                        self.commands.saveDevState(id, type, data || true);
                        return;
                    } else if (type == 'unreachable') {
                        self.commands.saveDevState(id, 'reachable', false);
                        return;
                    }
                    self.commands.saveDevState(id, type, data, 'state');
                }

                if(type == 'unregister') {
                    self.commands.deleteDevState(id);
                }

                // On every discovery we get these messages per device
                // Event- Device VirtualContactSensor1 type register data {"definition":{"name":"Core/Devices/Virtual/ContactSensor","version":"0.0.1","interfaces":["Facades/HasContact"]}}
                // Event- Device VirtualContactSensor1 type reachable data null
                // Event- Device VirtualContactSensor1 type discovery data {"definition":{"name":"Core/Devices/Virtual/ContactSensor","version":"0.0.1","interfaces":["Facades/HasContact"]}}
                if (type === 'discovery') {
                    if(data && data.interfaces) {
                        var deviceInterfaces = data.interfaces.filter(isDeviceInterface);
                        if(deviceInterfaces.length > 0) {
                            self.commands.assignUIElements(id, data.definition.name, true);
                            logger.info('Discovered new device ' + id);
                            self.commands.seedDeviceState();
                        }
                    }
                    // var c = 0;
                    // var discover_event = setInterval(function() {
                    //     c = c + 1;
                    //     // dev$.selectByID(id).get();
                    //     // self.commands.pullDeviceState(id);
                    //     if (c === 5) {
                    //         clearInterval(discover_event);
                    //     }
                    // }, 20000);
                }
            }
        });

        this.allStates = dev$.select('id=*');
        this.allStates.subscribeToState('+');
        this.allStates.on('state', function(id, type, data) {
            if (id !== 'DevStateManager') {
                if (type !== 'register' &&
                    type !== 'discovery' &&
                    type !== 'zigbeePairingProgress' &&
                    type.indexOf('Pairer') == -1) {
                    if (type == 'reachable') {
                        self.commands.saveDevState(id, type, data || true);
                        return;
                    } else if (type == 'unreachable') {
                        self.commands.saveDevState(id, 'reachable', false);
                        return;
                    }
                    self.commands.saveDevState(id, type, data, 'state');
                }
                if(type == 'unregister') {
                    self.commands.deleteDevState(id);
                }
                if (type === 'discovery') {
                    if(data && data.interfaces) {
                        var deviceInterfaces = data.interfaces.filter(isDeviceInterface);
                        if(deviceInterfaces.length > 0) {
                            self.commands.assignUIElements(id, data.definition.name, true);
                            logger.info('Discovered new device ' + id);
                            self.commands.seedDeviceState();
                        }
                    }
                    // var c = 0;
                    // var discover_state = setInterval(function() {
                    //     c = c + 1;
                    //     // dev$.selectByID(id).get();
                    //     // self.commands.pullDeviceState(id);
                    //     if (c === 5) {
                    //         clearInterval(discover_state);
                    //     }
                    // }, 20000);
                }
            }
        });

        this._disableUIElement = true;
        //Hack to get it working on the relay. Relay slows down on boot
        setTimeout(function() {
            self._disableUIElement = false;
            self.commands.getOnlineDevicesWithFacades();
        }, 90000);
    },
    stop: function() {

    },
    state: {
        data: {
            get: function() {
                return Promise.resolve(this._devStates);
            },
            set: function() {
                return Promise.reject('Read only facade');
            }
        },
        listResources: {
            get: function() {
                return Promise.resolve(this._devStates.discoveredDevices);
            },
            set: function() {
                return Promise.reject('Read only facade');
            }
        },
        devicesPerProtocol: {
            get: function() {
                return Promise.resolve(this._devStates.devicesPerProtocol);
            },
            set: function() {
                return Promise.reject('Read only facade');
            }
        }
    },
    commands: {
        populateDevStates: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                ddb.local.get('DevStateManager.DeviceStates').then(function(result) {
                    if (result === null || result.siblings.length === 0) {
                        //throw new Error('No such job');
                        logger.error('No device state found');
                        return resolve();
                    }

                    self._devStates = JSON.parse(result.siblings[0]);
                    Object.keys(self._devStates).forEach(function(deviceId) {
                        //Make all unreachable and let the polling update the reachable state
                        if(typeof self._devStates[deviceId].reachable !== 'undefined') {
                            self._devStates[deviceId].reachable = false;
                        }
                        self._devStates[deviceId].state = self._devStates[deviceId].state || {};
                    });
                    delete self._devStates.discoveredDevices;
                    logger.debug('Got previous device states ' + JSON.stringify(self._devStates));
                    resolve();
                });
            });
        },
        startPeriodicSave: function() {
            var self = this;
            this._ddbSaveTimer = setInterval(function() {
                logger.debug('Saving to database...');
                ddb.local.put('DevStateManager.DeviceStates', JSON.stringify(self._devStates));
            }, 60000);
        },
        seedDeviceState: function() {
            var self = this;
            logger.info('Populating device\'s initial states every 30 seconds. Seeding...');

            function seedStates() {
                var needDevState = {};
                self.commands.getOnlineDevicesWithFacades().then(function(devices) {
                    self.commands.getInterfaces().then(function(allInterfaces) {
                        Object.keys(devices).forEach(function(id) {
                            devices[id].forEach(function(intf) {
                                try {
                                    var type = Object.keys(allInterfaces[intf]['0.0.1']['state'])[0];
                                    if(typeof self._devStates[id][type] === 'undefined' || typeof self._devStates[id]['state'][type] === 'undefined') {
                                        if(typeof needDevState[id] === 'undefined') needDevState[id] = [];
                                        needDevState[id].push(type);
                                    }
                                } catch (e) {
                                    logger.error("Failed to maintain dev state " + id + ' intf ' + intf + ' err ' + e);
                                }
                            });
                        });

                        if(Object.keys(needDevState).length > 0) {
                            logger.info('Device\'s states needs to be initialized- ' + JSON.stringify(needDevState));
                            Object.keys(needDevState).forEach(function(id) {
                                needDevState[id].forEach(function(type) {
                                    dev$.selectByID(id).get(type).then(function(resp) {
                                        Object.keys(resp).forEach(function(id) {
                                            if (resp[id] &&
                                                resp[id].response &&
                                                (resp[id].response.result !== null && typeof resp[id].response.result !== 'undefined')) {
                                                self.commands.saveDevState(id, type, resp[id].response.result, 'state');
                                                logger.info('Device ' + id + ' type ' + type + ' has state ' + self._devStates[id][type]);
                                            } else {
                                                logger.warn('Device ' + id + ' failed to respond for ' + type + ' response ' + JSON.stringify(resp));
                                            }
                                        });
                                    });
                                });
                            });
                        } else {
                            logger.info('All online device\'s states are initialized!');
                        }
                        self._seeding = false;
                    });
                });
            }
            clearTimeout(this._immediateSeed);
            this._immediateSeed = setTimeout(function() {
                seedStates();
                self.commands.stopSeeding();
                self._seedTimer = setInterval(function() {
                    if(!self._seeding) {
                        self._seeding = true;
                        seedStates();
                    }
                }, 30000);
            }, 5000);
        },
        stopSeeding: function() {
            clearInterval(this._seedTimer);
        },
        pullDeviceState: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                dev$.select('id=*').listResources().then(function(resources) {
                    dev$.listResourceTypes().then(function(resourceTypes) {
                        if(resources[id] && resourceTypes[resources[id].type]) {
                            var deviceInterfaces = [];
                            try {
                                // var interfaces = resourceTypes[resources[id].type]['0.0.1'].interfaces;
                                deviceInterfaces = resourceTypes[resources[id].type]['0.0.1'].interfaces.filter(isDeviceInterface);
                            } catch (e) {
                                reject('Failed to filter interfaces ' + e);
                                logger.error("Failed to filter interfaces " + deviceId + ' type ' + resources[deviceId].type + ' err ' + e);
                                return;
                            }
                            self.commands.getInterfaces().then(function(allInterfaces) {
                                deviceInterfaces.forEach(function(intf) {
                                    var type;
                                    try {
                                        type = Object.keys(allInterfaces[intf]['0.0.1']['state'])[0];
                                    } catch (e) {
                                        reject('Failed to get type ' + e);
                                        logger.error("Failed to get device state " + deviceId + ' intf ' + intf + ' err ' + e);
                                        return;
                                    }
                                    var p = [];
                                    p.push(
                                        //logger.info('Polling interface ' + intf + ' at rate ' + pr/1000 + 'sec for device ' + deviceId);
                                        dev$.selectByID(id).get(type).then(function(resp) {
                                            Object.keys(resp).forEach(function(id) {
                                                if (resp[id] &&
                                                    resp[id].response &&
                                                    (resp[id].response.result !== null && typeof resp[id].response.result !== 'undefined')) {
                                                    self.commands.saveDevState(id, type, resp[id].response.result, 'state');
                                                    logger.info('Device ' + id + ' type ' + type + ' has state ' + self._devStates[id][type]);
                                                } else {
                                                    logger.warn('Device ' + id + ' failed to respond for ' + type + ' response ' + JSON.stringify(resp));
                                                }
                                            });
                                        })
                                    );

                                    Promise.all(p).then(function() {
                                        resolve(self._devStates[id]);
                                    }, function(err) {
                                        reject('Failed to get resource state ' + err);
                                    });
                                });
                            });
                        } else {
                            reject('Resource not found in the listResources');
                        }
                    });
                });
            });
        },
        saveDevState: function(id, type, data, key) {
            var update = false;
            var self = this;
            logger.debug('Saving new dev state');
            if (typeof this._devStates[id] === 'undefined') {
                this._devStates[id] = {};
            }
            if(this._devStates[id][type] !== data) {
                update = true;
                this._devStates[id][type] = data;
            }

            if(typeof key !== 'undefined' && typeof key === 'string') {
                if(typeof this._devStates[id][key] === 'undefined') {
                    this._devStates[id][key] = {};
                }
                if(this._devStates[id][key][type] !== data) {
                    update = true;
                    this._devStates[id][key][type] = data;
                    this._devStates[id].lastUpdated = Date.now();
                }
            }

            if(type === 'reachable') {
                this._devStates[id].lastUpdated = Date.now();
            }

            if(update) {
                //Need to enable this as we are now caching the device state in ddb
                //So instead of going all the way to relay, the device state is being pulled out from ddb in cloud
                // dev$.publishResourceStateChange(this._id, 'data', this._devStates);
                // clearTimeout(this._updateDataTimer);
                // this._updateDataTimer = setTimeout(function() {
                //     logger.info('Updating the devstatemanager data state...');
                //     dev$.selectByID('DevStateManager').get('data');
                //     self.state.data.get();
                //     dev$.publishResourceStateChange('DevStateManager', 'data', self._devStates);
                // }, 3000);
            }
        },
        deleteDevState: function(id) {
            if(typeof this._devStates[id] !== 'undefined') {
                delete this._devStates[id];
            }
        },
        saveDeviceName: function(id, name) {
            var self = this;
            if(typeof name !== 'string') {
                logger.error('Name is not type string ' + name);
                return Promise.reject('Name should be of type string');
            }
            if(!VALID_DEVICE_NAME_REGEX.test(name)) {
                logger.error("Regex failed. This name is not allowed (dont use backslash)!");
                return Promise.reject('Regex failed. This name is not allowed (dont use backslash)!');
            }
            return ddb.shared.put('WigWagUI:appData.resource.' + id + '.name', name).then(function() {
                return self.commands.saveDevState(id, 'name', name);
            });
        },
        getDeviceName: function(id) {
            return ddb.shared.get('WigWagUI:appData.resource.' + id + '.name').then(function(resp) {
                if(resp && resp.siblings)
                    return resp.siblings[0].replace(/[^a-zA-Z0-9- ]/g,'');
                else
                    return null;
            });
        },
        getAllDeviceNames: function() {
             var deviceNames = {};

            function next(err, result) {
                if(err) {
                    logger.error('Get device names ddb getMatches failed with error ' + err);
                    return;
                }
                // logger.info('Got listJobs response ' + JSON.stringify(result));

                var id;
                if(result.key.indexOf('.name') > -1) {
                    id = result.key.slice(result.prefix.length, result.key.indexOf('.name'));
                } else {
                    return;
                }

                if(id.length === 0) {
                    return;
                }

                deviceNames[id] = result.siblings[0].replace(/[^a-zA-Z0-9- ]/g,'');
            }

            return ddb.shared.getMatches('WigWagUI:appData.resource.', next).then(function() {
                return deviceNames;
            });
        },
        saveDeviceIcon: function(id, icon) {
            if(typeof icon !== 'string') {
                logger.error('Icon is not type string ' + icon);
                return Promise.reject('Icon should be of type string');
            }
            return ddb.shared.put('WigWagUI:appData.resource.' + id + '.glyph', icon);
        },
        getDeviceIcon: function(id) {
            return ddb.shared.get('WigWagUI:appData.resource.' + id + '.glyph').then(function(resp) {
                if(resp && resp.siblings)
                    return resp.siblings[0];
                else
                    return null;
            });
        },
        getAllDeviceIcons: function() {
             var deviceIcons = {};

            function next(err, result) {
                if(err) {
                    logger.error('Get device icons ddb getMatches failed with error ' + err);
                    return;
                }
                // logger.info('Got listJobs response ' + JSON.stringify(result));

                var id;
                if(result.key.indexOf('.glyph') > -1) {
                    id = result.key.slice(result.prefix.length, result.key.indexOf('.glyph'));
                } else {
                    return;
                }

                if(id.length === 0) {
                    return;
                }

                deviceIcons[id] = result.siblings[0];
            }

            return ddb.shared.getMatches('WigWagUI:appData.resource.', next).then(function() {
                return deviceIcons;
            });
        },
        assignDeviceName: function(id, type, isNewDevice) {
            var self = this;
            var name;
            return new Promise(function(resolve, reject) {
                self.commands.getDeviceName(id).then(function(resp) {
                    if(resp !== null) {
                        self.commands.saveDevState(id, 'name', resp);
                        return resolve(resp);
                    }

                    var resources = self._resources;
                    var index;
                    if(isNewDevice) {
                        index = Object.keys(resources).length;
                    } else {
                        index = Object.keys(resources).findIndex(function(element) { return element === id; });
                    }
                    if(index < 0) {
                        logger.warn('Could not find the device in the listResources. This should not have happened! Assigning last index to device name.');
                        index = Object.keys(resources).length;
                    }
                    logger.debug('Assign device name, got device index ' + index);
                    if(typeof self._stageName[type] !== 'undefined') {
                        name = self._stageName[type] + index;
                    } else {
                        //Find via regression
                        var interfaces = self._devices[id] || [];
                        logger.debug('Assign device name, got device interfaces- ' + interfaces);
                        var matches = [];
                        Object.keys(facadeWeights).forEach(function(byte, index, array) {
                            matches[index] = 0;
                            interfaces.forEach(function(intf) {
                                if(facadeWeights[byte].indexOf(intf) > -1) {
                                    matches[index]++;
                                    // weight = byte;
                                }
                            });
                        });
                        var max = Math.max.apply(null, matches);
                        var weight = Object.keys(facadeWeights)[matches.lastIndexOf(max)];

                        var postfix = facadePostfixNameBitMap[weight] || 'Device';
                        if(type.indexOf('Zwave') > -1) {
                            name = 'Z-Wave ' +  postfix;
                        } else if(type.indexOf('Zigbee') > -1) {
                            name = id.replace(/[^a-zA-Z]/g,'') + ' ' + postfix;
                        } else if(type.indexOf('Sonos') > -1) {
                            name =  'Sonos ' + postfix;
                        } else if(type.indexOf('PhilipsHue') > -1) {
                            name =  'PhilipsHue ' + postfix;
                        } else if(type.indexOf('Greenwave') > -1) {
                            name =  'Greenwave ' + postfix;
                        } else if(type.indexOf('LIFX') > -1) {
                            name =  'LIFX ' + postfix;
                        } else if(type.indexOf('Filament') > -1) {
                            name =  'Filament ' + postfix;
                        } else if(type.indexOf('Enocean') > -1) {
                            name =  'Enocean ' + postfix;
                        } else if(type.indexOf('BACnetMSTP') > -1) {
                            name =  'Bacnet ' + postfix;
                        } else if(type.indexOf('Modbus') > -1) {
                            if(type.indexOf('IMod6') > -1) {
                                name = 'IMod6 ' + postfix;
                            } else {
                                name = 'Modbus ' + postfix;
                            }
                        } else {
                            name = postfix;
                        }

                        name += index;

                        if(type.indexOf('Virtual') > -1) {
                            name = id;
                        }
                    }
                    logger.debug('Got name for device ' + id + ' name- ' + name);
                    self.commands.saveDeviceName(id, name);
                    self.commands.saveDevState(id, 'name', name);
                    resolve(name);
                });
            });
        },
        assignDeviceIcon: function(id, type, isNewDevice) {
            var self = this;
            var ret = "&#x2b1f";  //This is the generic device glyph
            return new Promise(function(resolve, reject) {
                self.commands.getDeviceIcon(id).then(function(resp) {
                    if(resp !== null) {
                        self.commands.saveDevState(id, 'icon', resp);
                        return resolve(resp);
                    }
                    if(typeof self._resourceGlyph[type] !== 'undefined') {
                        ret = self._resourceGlyph[type];
                    } else {

                        //Got generic device, resource is available
                        var interfaces = self._devices[id];
                        // var weight = 0x0000;
                        var matches = [];
                        Object.keys(facadeWeights).forEach(function(byte, index, array) {
                            matches[index] = 0;
                            interfaces.forEach(function(intf) {
                                if(facadeWeights[byte].indexOf(intf) > -1) {
                                    matches[index]++;
                                    // weight = byte;
                                }
                            });
                        });
                        var max = Math.max.apply(null, matches);
                        var weight = Object.keys(facadeWeights)[matches.indexOf(max)];
                        if(weight && weight !== 0x0000) {
                            ret = facadeGlyphBitMap[weight] || ret;
                        }
                    }
                    logger.debug('Got device icon for ' + id + ' icon- ' + ret);
                    self.commands.saveDeviceIcon(id, ret);
                    self.commands.saveDevState(id, 'icon', ret);
                    resolve(ret);
                });
            });
        },
        assignUIPlacement: function(id, facades) {
            var ret = {
                1: {},
                2: {},
                3: {}
            };

            //Needs to be ordered in priority level. If device has motion and battery then motion gets uiPlacement1 and battery 2.
            //Similarly if device has luminance, motion, temperature, virbration and battery then also motion gets 1 and rest 2

            //Something for sure takes 1st place
            if(facades.indexOf('Facades/Switchable') > -1) {
                ret[1].Switchable = true;
            }
            if(facades.indexOf('Facades/HasLock') > -1) {
                ret[1].HasLock = true;
            }
            if(facades.indexOf('Facades/Button') > -1) {
                ret[1].Button = true;
            }
            if(facades.indexOf('Facades/Regulator') > -1) {
                ret[1].Regulator = true;
            }
            if((facades.indexOf('Facades/Flipflop') > -1) && (facades.indexOf('Facades/ThermostatMode') == -1)) {
                ret[1].Flipflop = true;
            }
            if(facades.indexOf('Facades/HasWaterLeakDetector') > -1) {
                ret[1].HasWaterLeakDetector = true;
            }
            if(facades.indexOf('Facades/HasContact') > -1) {
                ret[1].HasContact = true;
            }
            if(facades.indexOf('Facades/HasMotion') > -1) {
                ret[1].HasMotion = true;
            }
            if(facades.indexOf('Facades/HasSmokeAlarm') > -1) {
                ret[1].HasSmokeAlarm = true;
            }
            if(facades.indexOf('Facades/Override') > -1) {
                    ret[1].Override = true;
            }

            //Somethings for sure takes 2nd place
            if(facades.indexOf('Facades/Dimmable') >  -1) {
                ret[2].Dimmable = true;
            }

            //Something for sure takes next page for controls
            if(facades.indexOf('Facades/hasWhiteTemp') >  -1) {
                ret[3].hasWhiteTemp = true;
            }
            if(facades.indexOf('Facades/Colorable') >  -1) {
                ret[3].Colorable = true;
            }
            if(facades.indexOf('Facades/MediaStream') > -1) {
                ret[3].MediaStream = true;
            }
            if(facades.indexOf('Facades/ThermostatMode') >  -1) {
                ret[3].ThermostatMode = true;
            }


            if(facades.indexOf('Facades/HasLuminance') > -1) {
                if(Object.keys(ret[1]).length === 0)
                    ret[1].HasLuminance = true;
                else
                    ret[2].HasLuminance = true;
            }
            if(facades.indexOf('Facades/HasTemperature') > -1) {
                if(Object.keys(ret[1]).length === 0)
                    ret[1].HasTemperature = true;
                else
                    ret[2].HasTemperature = true;
            }
            if(facades.indexOf('Facades/Ultraviolet') > -1) {
                if(Object.keys(ret[1]).length === 0)
                    ret[1].Ultraviolet = true;
                else
                    ret[2].Ultraviolet = true;
            }
            if(facades.indexOf('Facades/Humidity') > -1) {
                if(Object.keys(ret[1]).length === 0)
                    ret[1].Humidity = true;
                else
                    ret[2].Humidity = true;
            }
            if(facades.indexOf('Facades/HasVibration') > -1) {
                if(Object.keys(ret[1]).length === 0)
                    ret[1].HasVibration = true;
                else
                    ret[2].HasVibration = true;
            }
            if(facades.indexOf('Facades/HasTamper') > -1) {
                if(Object.keys(ret[1]).length === 0)
                    ret[1].HasTamper = true;
                else
                    ret[2].HasTamper = true;
            }

            //least
            if(facades.indexOf('Facades/HasBattery') > -1) {
                if(Object.keys(ret[1]).length === 0)
                    ret[1].HasBattery = true;
                else
                    ret[2].HasBattery = true;
            }

            //When do not satisfy any of the above
            if(Object.keys(ret[1]).length === 0 && Object.keys(ret[2]).length === 0 &&Object.keys(ret[3]).length === 0) {
                ret[1][facades[0].slice('/')] = true;
                facades.splice(0, 1);
                facades.forEach(function(facade) {
                    ret[2][facade.slice('/')]  = true;
                });
            }

            this.commands.saveDevState(id, 'uiPlacement', ret);
        },
        assignUIElements: function(id, type, isNewDevice) {
            var self = this;

            if(this._disableUIElement) {
                logger.trace('UI element assignment is disabled on boot for 90 seconds.');
                return;
            }

            logger.debug('Assigning UI element to device ' + id);

            function uiElements() {
                self.commands.assignDeviceName(id, type, isNewDevice).then(function(deviceName) {
                    self.commands.assignDeviceIcon(id, type, isNewDevice);
                });
            }

            if(isNewDevice) {
                self.commands.getResourcesWithFacades().then(function() {
                    uiElements();
                });
            } else {
                uiElements();
            }
        },
        startPoll: function() {
            var self = this;
            var count = 0;
            var throttlePollTimer;
            var pollTimeout;
            logger.info('Starting dev state poll at interval ' + self._pollingResolution);
            clearInterval(self._interval);

            function getDeviceStates(deviceId, interfaces) {
                interfaces.forEach(function(intf) {
                    var type;
                    try {
                        type = Object.keys(self._devInterfaces[intf]['0.0.1']['state'])[0];
                    } catch (e) {
                        logger.error("Failed to get device state " + deviceId + ' intf ' + intf + ' err ' + e);
                        return;
                    }
                    //logger.info('Polling interface ' + intf + ' at rate ' + pr/1000 + 'sec for device ' + deviceId);
                    dev$.selectByID(deviceId).get(type).then(function(resp) {
                        Object.keys(resp).forEach(function(id) {
                            if (resp[id] &&
                                resp[id].response &&
                                (resp[id].response.result !== null && typeof resp[id].response.result !== 'undefined')) {
                                self.commands.saveDevState(id, type, resp[id].response.result, 'state');
                                logger.debug('Device ' + id + ' type ' + type + ' has state ' + self._devStates[id][type]);
                            } else {
                                logger.warn('Device ' + id + ' failed to respond for ' + type + ' response ' + JSON.stringify(resp));
                            }
                        });
                    });
                });
            }

            function poll() {
                self.commands.getInterfaces().then(function(inter) {
                    var intf = Object.keys(inter).filter(function(val) {
                        var x = Object.keys(self._pollingSchemes).find(function(element) {
                            return self._pollingSchemes[element].interfaces.indexOf(val) !== -1;
                        });
                        pr = (x === undefined) ? self._defaultPollingRate : self._pollingSchemes[x].interval;
                        return (pr !== 0 && count % (Math.round(pr / self._pollingResolution)) === 0);
                    });
                    if (intf.length === 0) {
                        logger.debug('No interfaces to be polled');
                        self._isPolling = false;
                        clearTimeout(pollTimeout);
                        return;
                    }
                    logger.info('Retreiving data of interfaces- ' + JSON.stringify(intf));
                    self.commands.getOnlineDevicesWithFacades().then(function(devices) {
                        if(Object.keys(devices).length > 0) {
                            logger.debug('Got online devices with facades ' + JSON.stringify(devices) + ' of length ' + Object.keys(devices).length);
                            var index = 0;
                            Object.keys(devices).forEach(function(id) {
                                devices[id] = devices[id].filter(function(val) {
                                    return intf.indexOf(val) !== -1;
                                });
                                if (devices[id].length === 0) {
                                    delete devices[id];
                                }
                            });
                            logger.info("Updating device states for: " + JSON.stringify(devices));
                            if (Object.keys(devices).length === 0) {
                                self._isPolling = false;
                                clearTimeout(pollTimeout);
                                return;
                            }
                            var id = Object.keys(devices)[index++];
                            var devIntf = devices[id];
                            getDeviceStates(id, devIntf);
                            clearInterval(throttlePollTimer);
                            throttlePollTimer = setInterval(function() {
                                if (index < Object.keys(devices).length) {
                                    id = Object.keys(devices)[index++];
                                    devIntf = devices[id];
                                    //logger.info('Get device state for id ' + id);
                                    getDeviceStates(id, devIntf);
                                }
                                if (index === Object.keys(devices).length) {
                                    logger.info('Periodic state update complete!');
                                    clearInterval(throttlePollTimer);
                                    self._isPolling = false;
                                    clearTimeout(pollTimeout);
                                }
                            }, 500);
                        } else {
                            logger.info('No online devices...');
                        }
                    });
                });
            }
            self._isPolling = true;
            poll();

            self._interval = setInterval(function() {
                count = (count + 1) & (self._maxPollingCycles);
                if (self._isPolling === false) {
                    self._isPolling = true;
                    poll();
                }
                pollTimeout = setTimeout(function() {
                    self._isPolling = false;
                }, 50000);
            }, self._pollingResolution);
        },
        stopPoll: function() {
            logger.debug('Stopping device state poll');
            clearInterval(this._interval);
        },
        isPolling: function() {
            return this._isPolling;
        },
        newPollRate: function(value) {
            logger.info('Got new poll rate ' + value + ' Note: Poll rate cannot be less than 30 sec.');
            this._pollingResolution = (value >= 30000) ? value : 30000;
            logger.info('Using new poll rate ' + this._pollingResolution);
        },
        getAll: function() {
            return JSON.stringify(this._devStates);
        },
        getDeviceState: function(id) {
            return this._devStates[id];
        },
        getDeviceInterfaceState: function(id, type) {
            return (typeof this._devStates[id] !== 'undefined') ? this._devStates[id][type] : null;
        },
        getInterfaces: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                if ((self._isInterfaceCycle % 200) === 0) {
                    self._isInterfaceCycle = 1;
                    dev$.listInterfaceTypes().then(function(interfaces) {
                        self._devInterfaces = interfaces;
                        return resolve(interfaces);
                    }, function(err) {
                        return resolve(self._devInterfaces);
                    });
                } else {
                    return resolve(self._devInterfaces);
                }
                self._isInterfaceCycle++;
            });
        },
        getResourcesWithFacades: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                dev$.listResourceTypes().then(function(resourceTypes) {
                    self._resourceTypes = resourceTypes;
                    logger.trace('Got resourceTypes ' + JSON.stringify(resourceTypes));
                    dev$.select('id=*').listResources().then(function(resources) {
                        self._resources = resources;
                        logger.trace('Got resources ' + JSON.stringify(resources));
                        Object.keys(resources).forEach(function(deviceId) {
                            if (typeof resourceTypes[resources[deviceId].type] !== 'undefined') {
                                self._devices[deviceId] = resourceTypes[resources[deviceId].type]['0.0.1'].interfaces;
                            } else {
                                logger.error('Type not defined in the listResourceTypes ' + JSON.stringify(resources[deviceId]));
                            }
                        });
                        resolve();
                    }, function(err) {
                        logger.error('Failed to get resources ' + err);
                    });
                }, function(err) {
                    logger.error('Failed to get listResourceTypes ' + err);
                });
            });
        },
        getOnlineDevicesWithFacades: function() {
            var self = this;
            var devices = {};
            return new Promise(function(resolve, reject) {
                dev$.listResourceTypes().then(function(resourceTypes) {
                    self._resourceTypes = resourceTypes;
                    logger.trace('Got resourceTypes ' + JSON.stringify(resourceTypes));
                    dev$.select('id=*').listResources().then(function(resources) {
                        self._resources = resources;
                        logger.trace('Got resources ' + JSON.stringify(resources));

                        //Refresh the devStates object
                        //Delete the devices which are no longer in listResources
                        self._numberOfDevicesPerProtocol = {
                            "Modbus": 0,
                            "Bacnet": 0,
                            "6LoWPAN": 0,
                            "ZigBee": 0,
                            "Virtual": 0,
                            "Z-Wave": 0
                        };
                        Object.keys(resources).forEach(function(deviceId) {
                            if (typeof resourceTypes[resources[deviceId].type] !== 'undefined') {
                                //Save everything in the global variable
                                self._devices[deviceId] = resourceTypes[resources[deviceId].type]['0.0.1'].interfaces;
                                var deviceInterfaces = [];
                                try {
                                    deviceInterfaces = resourceTypes[resources[deviceId].type]['0.0.1'].interfaces.filter(isDeviceInterface);
                                } catch (e) {
                                    logger.error("Failed to filter interfaces " + deviceId + ' type ' + resources[deviceId].type + ' err ' + e);

                                }
                                if (deviceInterfaces.length > 0) {
                                    if(typeof self._devStates.discoveredDevices === 'undefined') {
                                        self._devStates.discoveredDevices = [];
                                    }
                                    if(self._devStates.discoveredDevices.indexOf(deviceId) === -1) {
                                        self._devStates.discoveredDevices.push(deviceId);
                                    }
                                    //Save device facades to devstates- used by mobile app
                                    self.commands.saveDevState(deviceId, 'facades', deviceInterfaces);
                                    self.commands.saveDevState(deviceId, 'resourceType', resources[deviceId].type);
                                    self.commands.assignUIElements(deviceId, resources[deviceId].type, false);
                                    self.commands.assignUIPlacement(deviceId, deviceInterfaces);
                                    //save reachable state to devstates- used by mobile app
                                    self.commands.saveDevState(deviceId, 'reachable', resources[deviceId].reachable);

                                    if (resources[deviceId].registered && resources[deviceId].reachable) {
                                        devices[deviceId] = deviceInterfaces;
                                    } else {
                                        logger.debug('Device ' + deviceId + ' is offline, not polling data');
                                    }

                                    if(resources[deviceId].type.toLowerCase().indexOf('modbus') > -1)
                                        self._numberOfDevicesPerProtocol.Modbus++;
                                    if(resources[deviceId].type.toLowerCase().indexOf('wigwag') > -1)
                                        self._numberOfDevicesPerProtocol["6LoWPAN"]++;
                                    if(resources[deviceId].type.toLowerCase().indexOf('virtual') > -1) {
                                        self.commands.saveDevState(deviceId, 'virtual', true);
                                        self._numberOfDevicesPerProtocol.Virtual++;
                                    } else {
                                        self.commands.saveDevState(deviceId, 'virtual', false);
                                    }
                                    if(resources[deviceId].type.toLowerCase().indexOf('zigbee') > -1)
                                        self._numberOfDevicesPerProtocol.ZigBee++;
                                    if(resources[deviceId].type.toLowerCase().indexOf('bacnet') > -1)
                                        self._numberOfDevicesPerProtocol.Bacnet++;
                                    if(resources[deviceId].type.toLowerCase().indexOf('zwave') > -1)
                                        self._numberOfDevicesPerProtocol["Z-Wave"]++;

                                }
                            } else {
                                logger.error('Type not defined in the listResourceTypes ' + JSON.stringify(resources[deviceId]));
                            }
                        });
                        var resourceIDs = Object.keys(resources);
                        logger.trace('All resourceIDs ' + JSON.stringify(resourceIDs));
                        Object.keys(self._devStates).forEach(function(id) {
                            if((resourceIDs.indexOf(id) == -1) && id !== 'discoveredDevices') {
                                logger.trace('Deleting resourceId ' + id);
                                delete self._devStates[id];
                            }
                        });
                        if(self._devStates && typeof self._devStates.discoveredDevices === 'undefined') {
                            self._devStates.discoveredDevices = [];
                        }
                        self._devStates.discoveredDevices.forEach(function(id) {
                            if(resourceIDs.indexOf(id) == -1) {
                                self._devStates.discoveredDevices.splice(self._devStates.discoveredDevices.indexOf(id), 1);
                            }
                        });
                        self._devStates.devicesPerProtocol = JSON.parse(JSON.stringify(self._numberOfDevicesPerProtocol));
                        resolve(devices);
                    }, function(err) {
                        logger.error('Failed to get resources ' + err);
                    });
                }, function(err) {
                    logger.error('Failed to get listResourceTypes ' + err);
                });
            });
        },
        logLevel: function(value) {
            global.GLOBAL.DevStateLogLevel = value;
        },
        setFacadePollingRate: function(facade, rate) {
            var self = this;
            return new Promise(function(resolve, reject) {
                if (typeof rate !== 'number') {
                    return reject('Rate should be of type number');
                }
                rate = parseInt(rate, 10);
                if (isNaN(rate)) {
                    logger.error('Invalid type of rate');
                    return reject('Enter valid integer rate');
                } else if (rate !== 0 && rate < self._pollingResolution) { //If the rate is zero than never poll that facade
                    logger.error('Minimum polling rate is 500 miliseconds');
                    return reject('Failed to set this rate');
                } else if (rate > (self._maxPollingCycles * self._pollingResolution)) {
                    logger.error('Rate should be less than max polling interval- ' + self._maxPollingInterval);
                    return reject('Rate should be less than max polling interval- ' + self._maxPollingInterval);
                } else {
                    self._pollingSchemePerFacade[facade] = rate;
                    self._options.pollingSchemePerFacade[facade] = rate;
                    self.commands.saveToDatabase('DevStateManager.runtimeconfiguration', self._options);
                    logger.info('Using new poll rate for ' + facade + ": " + rate);
                    resolve("Successfully updated");
                }
            });
        },
        saveToDatabase: function(string, options) {
            return ddb.local.put(string, JSON.stringify(options));
        },
        retrieveFromDatabase: function(string) {
            return new Promise(function(resolve, reject) {
                ddb.local.get(string).then(function(result) {
                    if (result === null || result.siblings.length === 0) {
                        //throw new Error('No such job');
                        logger.error('No options found');
                        return reject('Failed to retrieve options');
                    }

                    var ddbOptions = JSON.parse(result.siblings[0]);
                    resolve(ddbOptions);
                    logger.info('Got options from database ' + JSON.stringify(ddbOptions));
                });
            });
        },
        deleteAll: function() {
            this._devStates = {};
            return ddb.local.delete('DevStateManager.DeviceStates');
        },
        data: function() {
            return Promise.resolve(this._devStates);
        }
    }
};

module.exports = dev$.resource('DevStateManager', DevStateManager);