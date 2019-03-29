const WebSocket = require('ws');
var ws = null;
try{
    ws = new WebSocket("http://192.168.1.132:3131/api/events",{ headers:{
            'Authorization': 'Bearer',
            'accept': 'application/hal+json'
        }
    });
    var body = {type:"subscribe",payload:{stream:"state",siteID:''}};
    var body1= {type:"subscribe",payload:{stream:"event",siteID:''}};
    var body2= {type:"subscribe",payload:{stream:"alert",siteID:''}};
    ws.on('open',function open(){
        console.log("Events webSocket connection established")
        ws.send(JSON.stringify(body));
        ws.send(JSON.stringify(body1));
        ws.send(JSON.stringify(body2));
        ws.on('message', function incoming(data) {
            console.log(data);
        });
        ws.on('close',function close(data){console.log("Events websocket disconnected " + data);})
        ws.on('error', function incoming(error) { console.log(error);});
        // resolve();
    });
    ws.on('error', function incoming(error) { console.log(error);
        ws.close('message',function incoming(data){ console.log(data);})
    });
}catch(e){
    console.log("Error:"+e);
}