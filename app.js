var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var os = require('os');

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
      engineData = msg.data;
      state="engineReady";
      updateState();
    }else{
      engineSpinning = false;
    }
  }else if (msg.action =="stop"){
    engineSpinning = false;
    console.log("Engine Reset");
  }else if (msg.action =="torrentData"){
    io.emit("torrentData", msg.data);
  }
});

var tempDir = "./torrents";
var engineSpinning = false;
var remoteConnected = false;
var connectionCheckInterval = 2000;
var engineData;

var remote_port = 2000;
var tor_port = 8888;
var ip;

display.init();

var state = "noRemote";

var networkCheck = setInterval(function(){
  var ifaces = os.networkInterfaces();
  var prevIp = ip;
  var wlan;
  var eth;

  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        return;
      }

      if (ifname == "uap0"){
        return;
      }

      if (ifname == "wlan0"){
        wlan = iface.address;
      }else if (ifname == "eth0"){
        eth = iface.address;
      }
    });
  });

  if (eth){
    ip = eth;
  }else if (wlan){
    ip = wlan;
  }else {
    ip = null;
  }

  if (prevIp != ip){
    console.log("Ip changed: " + ip);

    if (ip == null){
      state="noInternet";
    }else{
      display.updateAddress(ip);
      state="noRemote";
    }
    return updateState();
  }

}, connectionCheckInterval);

app.get('/', function (req, res) {
  return res.sendFile('public/index.html');
});


io.on('connection', function(socket) {
   console.log('A user connected');


   remoteConnected = true;
   if (io.engine.clientsCount == 1){
     state="idle";
     updateState();
   }

   socket.on('loadMagnet', function (magnet) {
     tor_engine.postMessage({action:"start", data: {magnet:magnet, port: tor_port}});
     state="engineStarting";
     updateState();
   });

   socket.on('startPlayer', function (data) {
     if (!engineSpinning){
       return;
     }
     state="playback";
     updateState();
   });

   socket.on('stopPlayer', function (data) {
     if (!engineSpinning){
       return;
     }
     state="idle";
     updateState();
   });

   socket.on('playerPause', function (data) {
     if (!engineSpinning){
       return;
     }
     display.pausePlayer();
   });

   socket.on('playbackData', function (data) {
     display.playbackData(socket);
   });
   socket.on('playerSeekRel', function (data) {
     display.seekRel(data);
   });
   socket.on('playerSeek', function (data) {
     display.seek(data);
   });
   socket.on('playerVol', function (data) {
     display.volume(data);
   })


   socket.on('disconnect', function () {
      console.log('A user disconnected');
      if (io.engine.clientsCount == 0){
        state="noRemote";
        updateState();
      }
   });
});

function updateState(){
  switch(state) {
    case "noInternet":
      stopEngine();
      display.noRemote();
      break
    case "noRemote":
      stopEngine();
      display.noRemote();
      break;
    case "idle":
      stopEngine();
      display.remoteConnected();
      break;
    case "engineStarting":
      display.engineStarting();
      break;
    case "engineReady":
      io.emit('engineReady', engineData);
      display.readyPlayback();
      break;
    case "playback":
      display.play(tor_port);
      break;
  }
}

function stopEngine(){
  if(engineSpinning){
    tor_engine.postMessage({action:"stop"});
  }
}

http.listen(remote_port, function() {
   console.log(`Vbox node listening on port ${remote_port}`);
});
