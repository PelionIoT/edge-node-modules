var util = require('util');
var fs = require('fs');
var JSONminify = require('jsonminify');

var mod = {};

var substVarsRegex = /\$\{[^\s}]+\}/g; // substitute var looks like --> ${something}

var getUserHome = function() {
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

var log_info = function() {
    //var args = Array.prototype.slice.call(arguments);
    //args.unshift("WebDeviceSim");
    if(global.log)
        log.info.apply(undefined,arguments);
    else
        console.log.apply(undefined,arguments);
};

var log_err = function() {
    if(global.log)
        log.error.apply(undefined,arguments);
    else {
        var args = Array.prototype.slice.call(arguments);
        args.unshift("ERROR");
        console.error.apply(undefined,args);
    }

};


var log_warn = function() {
    if(global.log)
        log.warn.apply(undefined,arguments);
    else {
        var args = Array.prototype.slice.call(arguments);
        args.unshift("WARN");
        console.error.apply(undefined,args);
    }
};

mod.do_fs_jsononly = function(filepath) {
    var json = null;
    try {
        json = fs.readFileSync(filepath, 'utf8');
    } catch(e) {
        log_err("Error reading:",filepath);
        log_err("  Details: " + util.inspect(e));
        return null;
    }
    if(json && typeof json == 'string') {
        return JSON.parse(json);
    } else {
        log_err("Failed to parse JSON for",filepath,e);
        return null;
    }
};

/**
 * An internal functions which replaces substitution variables like: '${devjs_root}' with an actual value. Review
 * the code for a complete list of all variables.
 * @method  resolveSubstitutionVars
 * @protected
 * @param  {String} str [description]
 * @param  {Object} map If passed in, this will replace any var named ${key} in 'map' with the given value for that key.
 * @return {String}       [description]
 */
mod.resolveVarsPath = function(str,map) {
    var replaceSubstVars = function(match) { //, p1, p2, p3, offset, string) {
        //if(match == "${devjs_root}") {
        //    return devjs_root_path;
        //} else
        //if(match == "${core}") {
        //    return devjs_core_path;
        //} else
        //if(match == "${conf}") {
        //    return devjs_conf_path;
        //} else
        if(match == "${home}") {
            return getUserHome();
        } else {
            if(map) {
                var keys = Object.keys(map);
                for(var n=0;n<keys.length;n++) {
                    if(match == "${" + keys[n] + "}") {
                        return map[keys[n]];
                    }
                }
            }
            log_warn('Unknown substitution variable: ' + match);
            return match;
        }
    };
    return str.replace(substVarsRegex,replaceSubstVars);
};

mod.mergeInEnv = function(map) {
    var ret = {};
    var envkeys = Object.keys(map);
    for(var n=0;n<envkeys.length;n++) {
        ret[envkeys[n]] = map[envkeys[n]];
    }
    envkeys = Object.keys(process.env);
    for(var n=0;n<envkeys.length;n++) {
        ret[envkeys[n]] = process.env[envkeys[n]];
    }
    return ret;
};

mod.minifyJSONParseAndSubstVars = function(s,cb, map) {
    if(!map) map = {};
    var envkeys = Object.keys(process.env);
    if(!s) { cb("No string"); return; }
    for(var n=0;n<envkeys.length;n++) {
        map[envkeys[n]] = process.env[envkeys[n]];
    }
    var ok = false;
    try {
        var data = mod.resolveVarsPath(s, map);
        var config = JSON.parse(JSONminify(data));
        ok = true;
    } catch(e) {
        cb("Error on JSON / vars sub parse: " + util.inspect(e));
    }
    if(ok)
        cb(null,config);
};

mod.minifyJSONParse = function(data,cb) {
    var ok = false;
    try {
        var config = JSON.parse(JSONminify(data));
        ok = true;
    } catch(e) {
        cb("Error on JSON / vars sub parse: " + util.inspect(e));
    }
    if(ok)
        cb(null,config);
};

mod.JSONminify = JSONminify;

module.exports = mod;
