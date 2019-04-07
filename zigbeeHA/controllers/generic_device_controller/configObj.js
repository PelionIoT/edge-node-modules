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
{ attrId: 17,
        access: 'read/write',
        default: 0,
        name: 'PIRUnoccupiedToOccupiedDelay',
        type: 'ZCL_DATATYPE_UINT16',
        unit: 'seconds',
        title: 'PIR Unoccupied To Occupied Delay',
        description: 'The PIRUnoccupiedToOccupiedDelay attribute is 16 bits in length and specifies the time delay, in seconds, before the PIR sensor changes to its occupied state after the detection of movement in the sensed area. T
his attribute is mandatory if the PIRUnoccupiedToOccupiedThreshold attribute is implemented.',
        operation: '',
        range: [Object],
        pattern: '^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-4])$',
        status: 134,
        statusCode: 'ZCL_STATUS_UNSUPPORTED_ATTRIBUTE',
        clusterClass: 1030,
        clusterClassId: 'occupancy_sensor' }


        {
                    "attrId": 17,
                    "access": "read/write",
                    "default": 0,
                    "name": "PIRUnoccupiedToOccupiedDelay",
                    "type": "ZCL_DATATYPE_UINT16",
                    "unit": "seconds",
                    "title": "PIR Unoccupied To Occupied Delay",
                    "description": "The PIRUnoccupiedToOccupiedDelay attribute is 16 bits in length and specifies the time delay, in seconds, before the PIR sensor changes to its occupied state after the detection of movement in the sensed area. This attribute is mandatory if the PIRUnoccupiedToOccupiedThreshold attribute is implemented.",
                    "operation": "",
                    "range": [
                        0,
                        65534
                    ],
                    "pattern": "^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-4])$"
                }