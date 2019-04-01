var config = null;
require('/wigwag/devjs-configurator').configure(__dirname)
    .then(function(data){
	log.debug("config:",data);
	config = data;
    }).catch(function(err){
        log.error(err);
    });	     

var n = 0;

setInterval(function(){
    log.debug("Test from maestrRunner testModule",n,"config:",config)
    n++
}, 1000);
