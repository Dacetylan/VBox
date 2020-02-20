const express = require('express');
const app = express();
var cors = require('cors');
var display = require("./display.js");
var path = require('path');
var fs = require('fs');
const { Worker } = require('worker_threads');

var tor_engine = new Worker("./tor_engine.js");

var waitRes;

tor_engine.on("message", function(msg){
  //console.log("Parent: ");
  //console.log(msg);
  if (msg.action == "start"){
    if (msg.success){
      engineSpinning = true;
      waitRes.send("Torrent loaded and ready to play");
    }else{
      engineSpinning = false;
      waitRes.send("Invalid Torrent");
      }
  }else if (msg.action =="stop"){
    engineSpinning = false;
    console.log("Engine Reset")
    waitRes.send("Reset Torrent");
  }
});

var tempDir = "./torrents";
var engineSpinning = false;

var remote_port = 3000;
var tor_port = 8888;

display.init();

function reset(){
  console.log("Resetting Player");
  display.resetPlayer();
  if(engineSpinning){
    console.log("Resetting Engine");

    tor_engine.postMessage({action:"stop"});
  }
}


app.use(cors());
app.use(express.static('public'));

app.get('/', function (req, res) {
  return res.sendFile('index.html');
});

app.get('/loadMagnet', async function (req, res) {
  var magnet = req.query.url;
  reset();


  tor_engine.postMessage({action:"start", data: {magnet:magnet, port: tor_port}});

  waitRes = res;
});

app.get('/play', function (req, res) {

  if (!engineSpinning){
    return res.send("There is nothing to play");
  }

  display.play(tor_port);

  res.send("Started playing");
});

app.get('/stop', function (req, res) {


  if (!engineSpinning){
    return res.send("There is nothing playing");
  }
  console.log("Stopping Engine");
  waitRes = res;
  reset();
});

app.listen(remote_port, () => console.log(`Vbox listening on port ${remote_port}!`));
