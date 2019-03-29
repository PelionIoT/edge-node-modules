 //LED top light controller.  code similar to Glowline
/**
 * [LED class for managing the led]
 */
var unix = require('unix-dgram');

var LED = function LED() {
    this.colorProfile = "RGB";
    this.currentred = 0;
    this.currentgreen = 0;
    this.currentblue = 0;
    this.currentalert = false;
    this.intervalobject = null;
    this._socketClient = null;
    this._socketReady = false;
    this._ledDriverSocketPath = "/tmp/ledDriver";
    if (LED.caller != LED.getInstance) {
        throw new Error("This object cannot be instanciated");
    }
};
/**
 * [init initializes the GPIO pins and the LED]
 * @return {[ES6-Promise]} [an ES6 style promise for determining if the gpio is ready]
 */
LED.prototype.init = function(LEDProfile, ledDriverSocketPath) {
    var self = this;
    //console.log("LPD6803 got inited with " + LEDProfile);
    if (LEDProfile === null || LEDProfile === undefined) {

        console.error("Make sure to specify a LED colorProfile. Defaulting to RGB.");
    } else {
        self.colorProfile = LEDProfile;
    }

    if(ledDriverSocketPath) {
        self._ledDriverSocketPath = ledDriverSocketPath;
    }

    console.info('LED: Using led driver socket path ' + self._ledDriverSocketPath);

    return self.createSocket();
};

LED.prototype.createSocket = function() {
    var self = this;
    self._retry_in_motion = false;
    return new Promise(function(resolve, reject) {
        if(self._socketClient) {
            try {
                self._socketClient.close();
                self._socketClient = null;
            } catch(err) {
                console.error("Failed to close socket ", err);
            }
        }
        self._socketClient = unix.createSocket('unix_dgram');

        self._socketClient.on('error',function(err) {
            console.error("LED: Error on socket creation", err);
            if(self._socketClient) {
                try {
                    self._socketClient.close();
                    self._socketClient = null;
                } catch(err) {
                    console.error("Failed to close socket ", err);
                }
            }
            self._socketReady = false;
            self._retrySocketConnection();
        });

        console.info("LED driver socket:", self._ledDriverSocketPath);
        var err = self._socketClient.connect(self._ledDriverSocketPath);

        if(!err) {
            self._socketReady = true;
            console.info("LED: Connected successfully to led driver socket");
            resolve();
        } else {
            console.info("LED: Failed to connect to led driver socket " + err);
            if(self._socketClient) {
                try {
                    self._socketClient.close();
                    self._socketClient = null;
                } catch(err) {
                    console.error("Failed to close socket ", err);
                }
            }
            self._retrySocketConnection();
        }

        self._socketClient.on('connect',function() {
            console.info("LED: Established connection to led driver socket");
            self._socketReady = true;
        });

        self._socketClient.on('writable',function(){
            self._socketReady = true;
        });
    });
};

LED.prototype._retrySocketConnection = function() {
    var self = this;
    if(!self._retry_in_motion) {
        setTimeout(function(){
            self._retry_in_motion = false;
            console.info("Failure on leddriver socket connect. Will retry (2).");
            self.createSocket();
        }, 5000);
        self._retry_in_motion = true;
    }
};

/**
 * [setColorProfile function set the color profile of the LED used on the hardware .]
 * @param  {[string]} LEDProfile   ['RGB', 'RBG']
 */
LED.prototype.setColorProfile = function(LEDProfile) {
    if (typeof LEDProfile === 'undefined' || LEDProfile === null || LEDProfile === undefined) {
        console.error("Make sure to specify a LED colorProfile.  Defaulting to RGB.");
    } else {
        this.colorProfile = LEDProfile;
        console.info('Color profile changed to- ', this.colorProfile);
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

    var command = new Buffer('led ' + red + ' ' + green + ' ' + blue);
    if(this._socketReady && self._socketClient) {
        try {
            self._socketClient.send(command);
        } catch(err) {
            console.error('Failed to send ', err);
            self._retrySocketConnection();
        }
    } else {
        console.error('LED: Socket is not ready for led command to be sent. Try again..');
        self._retrySocketConnection();
    }
};

LED.prototype.playTone = function(index) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var command = new Buffer('piezo_tone ' + index);
        if(self._socketReady && self._socketClient) {
            try {
                self._socketClient.send(command);
                resolve();
            } catch(err) {
                console.error('Failed to send ', err);
                reject('Failed to send ' + err);
            }
        } else {
            reject('deviceOSWD socket not connected!');
        }
    });
};

LED.prototype.stopheartbeat = function() {
    this.haveHeartbeat = false;
};

LED.prototype.heartbeat = function(red, green, blue, bdiff) {
    self = this;
    if(this.currentalert) {
        this.setcolor(red, green, blue);
        this.haveHeartbeat = false;
        return; 
    }
    if(!bdiff) bdiff = 2;
    if(this.haveHeartbeat && this.heartbeatColor && (red == this.heartbeatColor.r && green == this.heartbeatColor.g && blue == this.heartbeatColor.b)) {
        //Heartbeat already running with same color 
        return;
    } else {
        this.haveHeartbeat = false;
    }
    function goLow() {
        setTimeout(function() {
            self.setcolor(red - bdiff, green - bdiff, blue - bdiff);
            if(self.haveHeartbeat) goHigh();
        }, 2000);
    }

    function goHigh() {
        setTimeout(function() {
            self.setcolor(red, green, blue);
            if(self.haveHeartbeat) goLow();
        }, 500);
    }

    this.heartbeatColor = {r: red, g: green, b: blue};
    this.setcolor(red, green, blue);
    this.haveHeartbeat = true;
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
    function setColor(red, green, blue) {
        self._setcolor(red, green, blue);
    }
    self.intervalobject = setInterval(function() {
        if (status == 1) {
            status++;
            setColor(red, green, blue);
        }
        else {
            if (status == 2) {
                setColor(self.currentred, self.currentgreen, self.currentblue);
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