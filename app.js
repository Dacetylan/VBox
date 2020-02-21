var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var display = require("./display.js");
var path = require('path');
var fs = require('fs');
const { Worker } = require('worker_threads');

var tor_engine = new Worker("./tor_engine.js");

tor_engine.on("message", function(msg){
  //console.log("Parent: ");
  //console.log(msg);
  if (msg.action == "start"){
    if (msg.success){
      engineSpinning = true;
    }else{
      engineSpinning = false;
      }
  }else if (msg.action =="stop"){
    engineSpinning = false;
    console.log("Engine Reset")
  }
});

var tempDir = "./torrents";
var engineSpinning = false;

var remote_port = 2000;
var tor_port = 8888;

display.init();


app.get('/', function (req, res) {
  return res.sendFile('public/index.html');
});


io.on('connection', function(socket) {
   console.log('A user connected');

   socket.on('loadMagnet', function (magnet) {
     reset();
     tor_engine.postMessage({action:"start", data: {magnet:magnet, port: tor_port}});
   });

   socket.on('startPlayer', function (data) {
     if (!engineSpinning){
       return;
     }

     display.play(tor_port);
   });

   socket.on('stopPlayer', function (data) {
     if (!engineSpinning){
       return;
     }
     console.log("Stopping Engine");
     reset();
   });

   socket.on('playerPause', function (data) {
     if (!engineSpinning){
       return;
     }

     display.pausePlayer();
   });


   socket.on('disconnect', function () {
      console.log('A user disconnected');
   });
});

function reset(){
  console.log("Resetting Player");
  display.resetPlayer();
  if(engineSpinning){
    console.log("Resetting Engine");

    tor_engine.postMessage({action:"stop"});
  }
}

http.listen(remote_port, function() {
   console.log(`Vbox node listening on port ${remote_port}`);
});
