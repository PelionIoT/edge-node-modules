const crypto = require('crypto'),
    algorithm = 'aes-128-cbc',
    password = 'd6F3Efeqd6F3Efeq';

var encrypt = function (buffer) {
    try {
        var cipher = crypto.createCipher(algorithm, password)
        var crypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        return crypted;
    } catch (err) {
        console.error('Failed ', err);
    }
}

var DoorLock = {
    start: function (options) {
        var self = this;
        this._ble = options.ble;
        this._resourceID = options.id;
        this._supportedStates = options.supportedStates;
        //"reachable" event
        self.emit('reachable');
        this._lock = 'lock';
        if ((options.initialState && options.initialState.state)) {
            this._lock = options.initialState.state.lock || this._lock;
        }
    },
    stop: function () {},
    state: {
        lock: {
            get: function () {
                return Promise.resolve(this._lock);
            },
            set: function (value) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    if (value == 'unlock') {
                        // value = 'lock'
                        var encrypteddata = encrypt(new Buffer('unlock,wwr0x'))
                        self._ble.write(encrypteddata, true, function (error) {
                            //true is because I am not expecting a ack from service
                            if (error) {
                                return reject('Error in sending message ' + error)
                            } else {
                                setTimeout(self.state.lock.set, 2000, 'lock')
                                return resolve();
                            }
                            // resolve('Data sent successfully')
                        })
                    } else if (value == 'lock') {
                        this._lock = value;
                        return resolve();
                    } else {
                        reject("Value not valid")
                    }
                })
            }
        },
    },
    getState: function () {
        var s = {};
        var self = this;
        var p = [];
        var rejected = false;
        return new Promise(function (resolve, reject) {
            self._supportedStates.forEach(function (type) {
                p.push(
                    new Promise(function (resolve, reject) {
                        self.state[type].get().then(function (value) {
                            if (value !== null) {
                                s[type] = value;
                            }
                            resolve();
                        }).catch(function (e) {
                            s[type] = e;
                            rejected = true;
                            resolve();
                        });
                    })
                );
            });
            Promise.all(p).then(function () {
                if (!rejected) {
                    return resolve(s);
                } else {
                    return reject(JSON.stringify(s));
                }
            });
        });
    },
    setState: function (value) {
        var self = this;
        var s = {};
        var p = [];

        var rejected = false;

        return new Promise(function (resolve, reject) {
            Object.keys(value).forEach(function (key) {
                p.push(
                    new Promise(function (resolve, reject) {
                        if (self._supportedStates.indexOf(key) > -1) {
                            self.state[key].set(value[key]).then(function (result) {
                                s[key] = (result === undefined) ? 'Updated successfully to value ' + value[key] : result;
                                resolve();
                            }).catch(function (e) {
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

            Promise.all(p).then(function (result) {
                if (!rejected) {
                    resolve(s);
                } else {
                    reject(JSON.stringify(s));
                }
            }, function (e) {
                reject(e);
            });
        });
    },
    commands: {
        emit: function () {
            var self = this;
            return this.getState().then(function (states) {
                return self.setState(states);
            });
        },
        reachable: function (value) {
            if (value) {
                this.emit('reachable');
            } else {
                this.emit('unreachable');
            }
        }
    }
};

module.exports = DoorLock;