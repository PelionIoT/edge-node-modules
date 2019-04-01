## maestroRunner

### Description

This module is responsible for starting one or more deviceJS modules in a single process, 
typically from the [maestro](https://github.com/WigWagCo/maestro) systems management daemon.

### How it works

This is a node.js script, which when launched with node looks for the following:

- A `DEVJS_ROOT` environment variable, which will be a path in the file system where the deviceJS runtime's root folder is located.
- A `DEVJS_CONFIG_FILE` environment vairable, which is the full path of the deviceJS configuration file.
- An optional `RUNNER_SUBST` environmental variable. See below.
- JSON encoded data on standard input, which should be the configuration object which tells maestroRunner what to start and how
- The JSON data on standard input may have comments, as per the [JSON.minify](https://github.com/getify/JSON.minify) standard.

##### JSON configuration object

This JSON object's format is:

```
{ 
  "moduleconfigs" : [
    {
      "exec_cmd": "/wigwag/devicejs-core-modules/AppServer",
      "config": "{\"authentication\": {\r\n\t\t\"enabled\": true,\r\n\t\t\"cloudAPISecret\": \"28e9e4d19e797028e600eadaf3fdc3db\",\r\n\t\t\"redirectURL\": \"\/wigwag-ui\/s\/login\/\",\r\n\t\t\"cloudRedirectURL\": \"https:\/\/devcloud.wigwag.io\/s\/login\"\r\n\t},\r\n\t\"port\": 4443,\r\n\t\"ssl\": {\r\n\t\t\"key\": \"\/home\/ed\/work\/devicejs-core-modules\/Runner\/.ssl\/client.key.pem\",\r\n\t\t\"cert\": \"\/home\/ed\/work\/devicejs-core-modules\/Runner\/.ssl\/client.cert.pem\",\r\n\t\t\"ca\": [\r\n\t\t\t\"\/home\/ed\/work\/devicejs-core-modules\/Runner\/.ssl\/ca.cert.pem\",\r\n\t\t\t\"\/home\/ed\/work\/devicejs-core-modules\/Runner\/.ssl\/intermediate.cert.pem\"\r\n\t\t]\r\n\t},\r\n\t\"relayID\": \"WWRL000006\"\r\n}"
    },
    {
      "exec_cmd": "/wigwag/devicejs-core-modules/APIProxy",
      "config": "{\"cloudAPISecret\": \"28e9e4d19e797028e600eadaf3fdc3db\",\r\n\"apiKey\": \"hello\",\r\n\"apiSecret\": \"asdfdsfa\"}"
    },
    {
      "path": "/wigwag/devicejs-core-modules/wigwag-core-modules/WigWagMobileUI",
      "config": null
    },
    {
      "path": "${thisdir}/../../wigwag-core-modules/WWRelayWebUI"
    }
  ],
  "process_config": "{\"devJSConfFile\":\"\/path\/here\/devicejs.conf\"}"
 }
```

The metavariable `${thisdir}` is replaced with the directory that `maestroRunner` resides in. The `config` field is always a string. 
Notice that if JSON needs to be passed to the module in the `config` field, it needs to be JSON-escaped. This [tool](https://www.freeformatter.com/json-escape.html) is handy.

Also, `process_config` needs to be JSON-escaped as well.

##### Substitution Variables

The following substitution variables are supported in the `config` string:

- `${home}` The full path of the home directory of the user executing the script
- `${thisdir}` The full path of where `maestroRunner`'s script resides. Useful for finding related core modules.

Also, any variables provided via the `RUNNER_SUBST` environmental variable will be substituted. This variables takes the format:

```
VARNAME:VALUE,VARNAME2:VALUE2,...
```

Where `${VARNAME}` will be sustituted for `VALUE`. Each pair should be comma separated.

All substitutions take place _before_ the string is JSON unescaped.

##### Testing

You can manually test maestroRunner, without Maestro, but doing something like this:

```
cat tests/example-config1.json | DEVJS_ROOT="\${home}/work/devicejs-ng" \ 
DEVJS_CONFIG_FILE="\${home}/work/devicejs-ng/.local/etc/devicejs/devicejs.conf" \
RUNNER_SUBST="specialsauce:709" node ./index.js 
```

