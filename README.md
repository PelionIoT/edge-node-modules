## Edge Node Modules
This repository hosts all the node modules which are ported on Pelion Edge.

### Install
Tested with node version 8.11.2.
To install all the node modules, run the following script -
```
install-all.sh
```

To indiviudally install, navigate to that node module and run -
```
cd <edge_node_module>
cp devicejs.json package.json
npm install
```

### Run
Note: Make sure Pelion Edge is running on your machine prior to running this -

```
cd <edge_node_module>
devicejs run ./
```
