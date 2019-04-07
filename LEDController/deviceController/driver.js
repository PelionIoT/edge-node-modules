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
var LEDDriver = {
    start: function(obj) {
        log.info('Starting LED Driver controller');
        this._ledController = obj.ledController;
        this._options = obj.config;
    },
    stop: function() {
    },
    state: {
        led: {
            set: function(value) {
                if(typeof value !== 'object' || typeof value.r === 'undefined' || typeof value.g === 'undefined' || typeof value.b === 'undefined') {
                    return Promise.reject('Parameter should be object {r,g,b} with value 0 to 255');
                } else {
                    return this.commands.ledColor(value.r, value.g, value.b);   
                }
            },
            get: function() {
                return this.commands.getState();
            }
        },
        piezo: { 
            set: function(index) {
                return this.commands.piezo(index);
            },
            get: function() { //All the possible tones
                return this._toneIndex;
            }
        },
        find: {
            get: function () {
                return Promise.reject('Write only facade!');
            },
            set: function() {
                var self = this;
                this.state.piezo.set(3);

                var counts = 0;
                var interval = setInterval(function() {
                    counts++;
                    if(counts >= 40) {
                        clearInterval(interval);
                    } else {
                        if(counts % 2 == 0) {
                            let color = 0xffffff;
                            let value = {r:(color&0xFF0000) >> 16, g:(color&0x00FF00) >> 8, b:(color&0x0000FF)};
                            // if(value.r > self._options.ledBrightness) value.r = self._options.ledBrightness;
                            // if(value.g > self._options.ledBrightness) value.g = self._options.ledBrightness;
                            // if(value.b > self._options.ledBrightness) value.b = self._options.ledBrightness;
                            self.state.led.set(value);
                        } else {
                            let color = 0x000000;
                            let value = {r:(color&0xFF0000) >> 16, g:(color&0x00FF00) >> 8, b:(color&0x0000FF)};
                            self.state.led.set(value);
                        }
                    }
                    // color = (color == 0xFF0000) ? 0x0000FF : (color << 8);
                }, 100);
            }
        }
    },
    commands: {
        ledColor: function(r, g, b) {
            return this._ledController.setColor(r, g, b);
        },
        getState: function() {
            return this._ledController.getCurrentState();
        },
        piezo: function(toneIndex) {
            if(typeof toneIndex === 'number') {
                this._toneIndex = toneIndex;
                return this._ledController.playTone(toneIndex);
            } else {
                return Promise.reject('Parameter has to be a number! Got type- ' + typeof toneIndex);
            }
        }
    }
};

module.exports = dev$.resource('LEDDriver', LEDDriver);