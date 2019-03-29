var Logger = require('./../../utils/logger');

var LightBulb = {
    start: function(options) {
        var self = this;
        this._logger = new Logger( {moduleName: options.id, color: 'green'} );
        this._logger.debug('starting controller');
        this._resourceID = options.id;
        this._supportedStates = options.supportedStates;

        //"reachable" event
        self.emit('reachable');
        this._power = 'on';
        this._brightness = 0.5;
        this._hsl = { h: 0.5, s: 1, l: 0.5};
        this._K = 4500;
        this._lastColorCall = 'colorTemperature';

        if( (options.initialState && options.initialState.state) ) {
            this._power = options.initialState.state.power || this._power;
            this._brightness = options.initialState.state.brightness || this._brightness;
            this._hsl = options.initialState.state.hsl || this._hsl;
            this._K = options.initialState.state.K || this._K;
            this._lastColorCall = options.initialState.state.lastColorCall || this._lastColorCall;
        }

    },
    stop: function() {
    },
    state: {
        power: {
            get: function() {
                return Promise.resolve(this._power);
            },
            set: function(value) {
                this._logger.debug('Got power ' + value);
                this._power = value;
                return Promise.resolve();
            }
        },
        brightness: {
            get: function() {
                return Promise.resolve(this._brightness);
            },
            set: function(value) {
                if(value < 0 || value > 1) {
                    return Promise.reject('Value should be within range 0 to 1');
                }

                if(value < 0) {
                    value = 0;
                }

                if(value > 1) {
                    value = 1;
                }
                this._logger.debug('Got brightness ' + value);
                
                if(value > 0) {
                    if(this._power == 'off') {
                        this._power = 'on';
                        dev$.publishResourceStateChange(this._resourceID, 'power', this._power);
                    }
                }

                this._brightness = value;
                return Promise.resolve();
            }
        },
        hsl: {
            get: function() {
                return Promise.resolve(this._hsl);
            },
            set: function(value) {
                if(typeof value !== 'object' || !value.hasOwnProperty('h') || !value.hasOwnProperty('s') || !value.hasOwnProperty('l')) {
                    return Promise.reject('Value should be of type object {h:[0 - 1], s:[0 - 1], l: [0 - 1]');
                }
                if(value.h < 0 || value.h > 1 || value.s < 0 || value.s > 1 || value.l < 0 || value.l > 1) {
                    return Promise.reject('Value of hsl should be within range 0 to 1');
                } 

                this._logger.debug('Got hsl ' + JSON.stringify(value));

                if(value.l === 0) {
                    if(this._power == 'on') {
                        this._power = 'off';
                        dev$.publishResourceStateChange(this._resourceID, 'power', this._power);
                    }
                }

                if(value.l > 0) {
                    if(this._power  == 'off') {
                        this._power = 'on';
                        dev$.publishResourceStateChange(this._resourceID, 'power', this._power);
                    }
                }

                this._brightness = value.l;
                // dev$.publishResourceStateChange(this._resourceID, 'brightness', this._brightness);

                this._lastColorCall = 'hsl';
                dev$.publishResourceStateChange(this._resourceID, 'lastColorCall', this._lastColorCall);
                this._hsl = value;
                return Promise.resolve();
            }
        },
        K: {
            get: function() {
                return Promise.resolve(this._K);
            },
            set: function(value) {
                if(value < 2000 || value > 8000) {
                    return Promise.reject('Value should be within range 2000 to 8000');
                }

                if(value < 2000) {
                    value = 2000;
                } 

                if(value > 8000) {
                    value = 8000;
                }

                if(this._power == 'off') {
                    this._power = 'on';
                    dev$.publishResourceStateChange(this._resourceID, 'power', this._power);
                }
                this._logger.debug('Got K ' + value);

                this._lastColorCall = 'colorTemperature';
                dev$.publishResourceStateChange(this._resourceID, 'lastColorCall', this._lastColorCall);
                this._K = value;
                return Promise.resolve();
            }
        },
        lastColorCall: {
            get: function() {
                return Promise.resolve(this._lastColorCall);
            },
            set: function(value) {
                return Promise.reject('Read only facade');
            }
        }
    },
    getState: function() {
        var s = {};
        var self = this;
        var p = [];

        var rejected = false;

        return new Promise(function(resolve, reject) {

            self._supportedStates.forEach(function(type) {
                p.push(
                    new Promise(function(resolve, reject) {
                        self.state[type].get().then(function(value) {
                            self._logger.debug('Got state ' + type + ' value ' + value);
                            if(value !== null) {
                                s[type] = value;
                            }
                            resolve();
                        }).catch(function(e) {
                            self._logger.trace('Get state failed for type ' + type + ' ' + e);
                            s[type] = e;
                            rejected = true;
                            resolve();
                        });
                    })
                );
            });

            Promise.all(p).then(function() {
                self._logger.debug('Got device state ' + JSON.stringify(s));
                s.lastColorCall = self._lastColorCall;
                if(!rejected) {
                    return resolve(s);
                } else {
                    return reject(JSON.stringify(s));
                }
            });
        });
    },
    setState: function(value) {
        var self = this;
        var s = {};
        var p = [];

        var rejected = false;

        return new Promise(function(resolve, reject) {
            Object.keys(value).forEach(function(key) {
                p.push(
                    new Promise(function(resolve, reject) {
                        if(self._supportedStates.indexOf(key) > -1) {
                            self.state[key].set(value[key]).then(function(result) {
                                self._logger.trace('Got result ' + result + ' for key ' + key);
                                s[key] = (result === undefined) ? 'Updated successfully to value ' + value[key] : result;
                                resolve();
                            }).catch(function(e) {
                                self._logger.error(key + ' got error- ' + e);
                                s[key] = e;
                                rejected = true;
                                resolve();
                            });
                        } else {
                            rejected = true;
                            s[key] = 'This interface is not supported';
                            resolve();
                        }
                    })
                );
            });

            Promise.all(p).then(function(result) {
                self._logger.debug('Resolving set state with data ' + JSON.stringify(s));
                if(!rejected) {
                    resolve(s);
                } else {
                    reject(JSON.stringify(s));
                }
            }, function(e) {
                reject(e);
            });
        });
    },
    commands: {
        on: function() {
            return this.state.power.set('on');
        },
        off: function() {
            return this.state.power.set('off');
        },
        emit: function() {
            var self = this;
            return this.getState().then(function(states) {
                return self.setState(states);
            });
        },
        reachable: function(value) {
            if(value) {
                this.emit('reachable');
            } else {
                this.emit('unreachable');
            }
        }
    }
};

module.exports = dev$.resource('Core/Devices/Virtual/LightBulb', LightBulb);