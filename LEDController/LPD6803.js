#!/usr/bin/env node
 //LED top light controller.  code similar to Glowline
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

var _valid_color = {
	"min": 0,
	"max": 30
};

function _openFD(path, fd) {
	return new Promise(function(resolve, reject) {
		fs.open(path, "w", 0666, function(err, fd) {
			if (err) reject(err);
			else resolve(fd);
		});
	});
}

// function _testArrayintwos(array) {
// 	if (array.length % 2 === 0) return true;
// 	else return false;
// }

// function _wrappedWrite(FD, stat) {
// 	FD = parseInt(FD);
// 	return new dev$Promise(null).when(function(token) {
// 		fs.write(FD, stat, null, null, function(err, written, string) {
// 			if (err) token.reject("error");
// 			else token.resolve("success");
// 		});
// 	});
// }

// function _writeColor(FR, FG, FB, r, g, b) {
// 	return new dev$Promise(null).join(_wrappedWrite(FR, r), _wrappedWrite(FB, b), _wrappedWrite(FG, g));
// }
/**
 * [LED class for managing the led]
 */
var LED = function LED() {
	this.colorProfile = "RGB";
	this.currentred = 0;
	this.currentgreen = 0;
	this.currentblue = 0;
	this.currentalert = false;
	this.intervalobject = null;
	this.SDATA = {
		"gpio": "/sys/class/gpio/gpio37/value",
		"FD": "",
		"des": "IO pin on the LPD6803"
	};
	this.SCLK = {
		"gpio": "/sys/class/gpio/gpio38/value",
		"FD": "",
		"des": "Clock pin on the LPD6803"
	};
	if (LED.caller != LED.getInstance) {
		throw new Error("This object cannot be instanciated");
	}
};
/**
 * [init initializes the GPIO pins and the LED]
 * @return {[ES6-Promise]} [an ES6 style promise for determining if the gpio is ready]
 */
LED.prototype.init = function(LEDProfile) {
	//console.log("LPD6803 got inited with " + LEDProfile);
	if (LEDProfile === null || LEDProfile === undefined) {

		log.error("LPD6803.js says make sure to specify a LED colorProfile.  Defaulting to RGB.");
	}
	else {
		this.colorProfile = LEDProfile;
	}
	var self = this;
	this.SDATA.high = function() {
		fs.writeSync(self.SDATA.FD, 1);
	};
	this.SDATA.low = function() {
		fs.writeSync(self.SDATA.FD, 0);
	};
	this.SCLK.high = function() {
		fs.writeSync(self.SCLK.FD, 1);
	};
	this.SCLK.low = function() {
		fs.writeSync(self.SCLK.FD, 0);
	};

	var Promise_FD_IO = _openFD(self.SDATA.gpio, self.FD_IO);
	var Promise_FD_CLK = _openFD(self.SCLK.gpio, self.FD_CLK);

	return Promise.all([
		Promise_FD_IO,
		Promise_FD_CLK
	]).then(function(results) {
		self.SDATA.FD = results[0];
		self.SDATA.low();
		self.SCLK.FD = results[1];
		self.SCLK.low();
	});
	/*return new Promise(function(resolve, reject) {
		

		Promise_FD_IO.then(function(result) {
			self.SDATA.FD = result;
			self.SDATA.low();
		}, function(err) {});
		Promise_FD_CLK.then(function(result) {
			self.SCLK.FD = result;
			self.SCLK.low();
			resolve("good man");
		}, function(err) {});

	});*/
};

/**
 * [setColorProfile function set the color profile of the LED used on the hardware .]
 * @param  {[string]} LEDProfile   ['RGB', 'RBG']
 */
LED.prototype.setColorProfile = function(LEDProfile) {
	if (typeof LEDProfile === 'undefined' || LEDProfile === null || LEDProfile === undefined) {
		log.error("LPD6803.js says make sure to specify a LED colorProfile.  Defaulting to RGB.");
	} else {
		this.colorProfile = LEDProfile;
		log.debug('LPD6803.js says changing color profile to- ', this.colorProfile);
	}
};

/**
 * [_setcolor internal function that does the work for actually setting the led.]
 * @param  {[integer]} red   [Red brightness 0 (off) through 30 (max bright)]
 * @param  {[integer]} green [Green brightness 0 (off) through 30 (max bright)]
 * @param  {[integer]} blue  [Blue brightness 0 (off) through 30 (max bright)]
 */
LED.prototype._setcolor = function(red, green, blue) {
	self = this;
	var i, j, k;
	var nDots = 1;
	time = 0;
	var t1;
	var t2;
    if(red < 0) {
        red = 0;
    }
    if(green < 0) {
        green = 0;
    }
    if(blue < 0) {
        blue = 0;
    }
	if (self.colorProfile != "RGB") {
		if (self.colorProfile == "RBG") {
			t1 = green;
			green = blue;
			blue = t1;
		}
		if (self.colorProfile == "GRB") {
			t1 = red;
			red = green;
			green = t1;
		}
		if (self.colorProfile == "GBR") {
			t1 = red;
			red = green;
			green = blue;
			blue = t1;
		}
		if (self.colorProfile == "BGR") {
			t1 = red;
			red = blue;
			blue = t1;
		}
		if (self.colorProfile == "BRG") {
			t1 = red;
			t2 = green;
			red = blue;
			green = t1;
			blue = t2;
		}
	}
	self.SCLK.low();
	self.SDATA.low();
	for (i = 0; i < 32; i++) {
		self.SCLK.high();
		self.SCLK.low();
	}
	for (i = 0; i < nDots; i++) {
		self.SDATA.high();
		self.SCLK.high();
		self.SCLK.low();
		//output 5 bits red data
		Mask = 0x10;
		for (j = 0; j < 5; j++) {
			maskfilter = (Mask & red);
			if (Mask & red) {
				self.SDATA.high();
			}
			else {
				self.SDATA.low();
			}
			self.SCLK.high();
			self.SCLK.low();
			Mask >>= 1;
		}
		// output 5 bits green data
		Mask = 0x10;
		for (j = 0; j < 5; j++) {
			if (Mask & blue) {
				self.SDATA.high();
			}
			else {
				self.SDATA.low();
			}
			self.SCLK.high();
			self.SCLK.low();
			Mask >>= 1;
		}
		// output 5 bits blue data
		Mask = 0x10;
		for (j = 0; j < 5; j++) {
			if (Mask & green) {
				self.SDATA.high();
			}
			else {
				self.SDATA.low();
			}
			self.SCLK.high();
			self.SCLK.low();
			Mask >>= 1;
		}
	}
	self.SDATA.low();
	for (i = 0; i < nDots; i++) {
		self.SCLK.high();
		self.SCLK.low();
	}
};

LED.prototype.heartbeat = function(red, green, blue, bdiff) {
    self = this;
    var i = 0;
    if(this.haveHeartbeat && this.heartbeatColor && (red == this.heartbeatColor.r && green == this.heartbeatColor.g && blue == this.heartbeatColor.b)) {
        //Heartbeat already running with same color 
        return;
    } else {
        this.haveHeartbeat = false;
        clearInterval(this.heartbeatTimer);
    }
    function goLow() {
        setTimeout(function() {
            self.setcolor(red - bdiff, green - bdiff, blue - bdiff);
            goHigh();
        }, 2000);
    }

    function goHigh() {
        setTimeout(function() {
            self.setcolor(red, green, blue);
            goLow();
        }, 500);
    }

    this.haveHeartbeat = true;
    this.heartbeatColor = {r: red, g: green, b: blue};
    this.setcolor(red, green, blue);
    goLow();
};

/**
 * [alertOn Enables the alert which will interrupt the locked color (last color set by setcolor(R,G,B)) every 2 seconds for 500ms]
 * @param  {[integer]} red   [Red brightness 0 (off) through 30 (max bright)]
 * @param  {[integer]} green [Green brightness 0 (off) through 30 (max bright)]
 * @param  {[integer]} blue  [Blue brightness 0 (off) through 30 (max bright)]
 */
LED.prototype.alertOn = function(red, green, blue) {
	self = this;
	status = 1;
	if (self.currentalert === true) {
		self.alertOff();
	}
	self.currentalert = true;
	self.intervalobject = setInterval(function() {
		if (status == 1) {
			status++;
			self._setcolor(red, green, blue);
		}
		else {
			if (status == 2) {
				self._setcolor(self.currentred, self.currentgreen, self.currentblue);
			}
			if (status == 5) {
				status = 0;
			}
			status++;
		}
	}, 500, status);
};
/**
 * [alertOff diables the current alert led (if there is one)]
 */
LED.prototype.alertOff = function() {
	self = this;
	if(self.currentalert) {
		self.currentalert = false;
		clearInterval(self.intervalobject);
	}
};

/**
 * [alertOneTime immediately blinks the led for 500ms]
 * @param  {[integer]} red   [Red brightness 0 (off) through 30 (max bright)]
 * @param  {[integer]} green [Green brightness 0 (off) through 30 (max bright)]
 * @param  {[integer]} blue  [Blue brightness 0 (off) through 30 (max bright)]
 */
LED.prototype.alertOneTime = function(red, green, blue) {
	var self = this;
	self._setcolor(red, green, blue);
	setTimeout(function() {
		self._setcolor(self.currentred, self.currentgreen, self.currentblue);
	}, 400);
};
	/**
	 * [setcolor locks the led to this color]
	 * @param  {[integer]} red   [Red brightness 0 (off) through 30 (max bright)]
	 * @param  {[integer]} green [Green brightness 0 (off) through 30 (max bright)]
	 * @param  {[integer]} blue  [Blue brightness 0 (off) through 30 (max bright)]
	 * @param  {[boolean]} checkPrevious  [Only apply if different from previous value]
	 */
LED.prototype.setcolor = function(red, green, blue, checkPrevious) {
	self = this;
	if (self.currentred == red && self.currentblue == blue && self.currentgreen == green && !!checkPrevious) {
		return;
	} else {
		self.currentred = red;
		self.currentgreen = green;
		self.currentblue = blue;
		self._setcolor(self.currentred, self.currentgreen, self.currentblue);
	}
};

LED.instance = null;
/**
 * LED getInstance definition
 * @return LED class
 */
LED.getInstance = function() {
	if (this.instance === null) {
		this.instance = new LED();
	}
	return this.instance;
};
	//a Singleton.  There is only 1 led, so the state should be treated universally throughout the entire system.
module.exports = LED.getInstance();