var Logger = require('./../../utils/logger');

var PanelLight = {
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
        if( (options.initialState && options.initialState.state) ) {
            this._power = options.initialState.state.power || this._power;
            this._brightness = options.initialState.state.brightness || this._brightness;
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
                    this._power = 'on';
                }

                this._brightness = value;
                return Promise.resolve();
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

module.exports = dev$.resource('Core/Devices/Virtual/PanelLight', PanelLight);