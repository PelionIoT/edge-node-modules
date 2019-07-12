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

"use strict";
var Helper = function() {

};

Helper.prototype.objectWithoutKey = function(obj, keys) {
  	var target = {};
  	for (var i in obj) {
  		if (keys.indexOf(i) >= 0) continue;
  		if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
  		target[i] = obj[i];
  	}
  	return target;
};

module.exports = {
	helper: new Helper()
};