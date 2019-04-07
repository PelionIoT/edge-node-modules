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
dev$.selectByID('VirtualDeviceDriver').call('listTemplates').then(function(a) {
    var templates = a.VirtualDeviceDriver.response.result;
    console.log('Got number of template controllers ' + templates.length + ' templates ' + JSON.stringify(templates));
    templates.forEach(function(type, index, array) {
        dev$.selectByID('VirtualDeviceDriver').call('create', type).then(function(resp) {
            console.log(index + ': Created type ' + type + ' response ' + JSON.stringify(resp));
        });
    });
});