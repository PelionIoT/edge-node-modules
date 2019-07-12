/*
* Copyright (c) 2019, Arm Limited and affiliates.
* SPDX-License-Identifier: Apache-2.0
*
* Licensed under the Apache License, Version 2.0 (the “License”);
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an “AS IS” BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var Logger = require('./../../utils/logger');

var logger = new Logger( {moduleName: 'DevicePairer', color: 'bgCyan'} );

var DevicePairer = dev$.resource('Bluetooth/DevicePairer', {
    start: function(options) {
        
        var self = this;
        this._bleModule = options.bleModule;
        
        this._bleModule.on('addDevice', function(stage) {
            // if(typeof pairingStages[stage] !== 'undefined') {
            //     logger.info(JSON.stringify(pairingStages[stage]));
            //     self.emit('pairingProgress', pairingStages[stage]);
            //}
            console.log("got addDevice command event")
        });

        this._bleModule.on('removeDevice', function(stage) {
            // if(typeof unpairingStages[stage] !== 'undefined') {
            //     logger.info(JSON.stringify(unpairingStages[stage]));
            //     self.emit('unpairingProgress', unpairingStages[stage]);
            // }
           console.log("got removeDevice command event")
        });
    },
    stop: function() {
    },
    state: {
    },
    commands: {
        addDevice: function(uuid) {
            return this._bleModule.connectDevice(uuid);
        },
        removeDevice: function(uuid) {
            return this._bleModule.removeDevice(uuid);
        }
    }
});

module.exports = DevicePairer;