const { spawn } = require("child_process");
var VLC = require('./vlc_wrapper.js');

var qr = require('qr-image');
var fs = require("fs");

const mergeImages = require('merge-images-v2');
const Canvas = require('canvas');

var player;
var playing = false;

exports.playing = function (){
  return playing;
}

exports.init = function(){
    player = new VLC("splashNR.png");
}

exports.playbackData = function(io){
  player.request("/requests/status.json", function(err,status){
    io.emit("playbackData", status);
  });
}

exports.seekRel = function(data){
  player.request("/requests/status.json?command=seek&val=" + data.type + data.amount, function(err,status){
  });
}
exports.seek = function(data){
  player.request("/requests/status.json?command=seek&val=" + data, function(err,status){
  });
}

exports.volume = function(data){
  player.request("/requests/status.json?command=volume&val=" + data, function(err,status){
  });
}

exports.remoteConnected = function(){
  reset(function(){

    player.request("/requests/status.json?command=in_play&input=splashRC.png", function(err,status){
    });
  });
}

exports.noRemote = function(){
  reset(function(){

    player.request("/requests/status.json?command=in_play&input=splashNR.png", function(err,status){
    });
  });
}

exports.engineStarting = function(){
  reset(function(){

    player.request("/requests/status.json?command=in_play&input=splashES.png", function(err,status){
    });
  });
}

exports.readyPlayback = function(){
  reset(function(){

    player.request("/requests/status.json?command=in_play&input=splashRP.png", function(err,status){
    });
  });
}

exports.resetPlayer = function(){
  reset(function(){

    player.request("/requests/status.json?command=in_play&input=splash.png", function(err,status){
    });
  });
}

exports.pausePlayer = function(){
  player.request("/requests/status.json?command=pl_pause", function(err,status){
  });
}

exports.play = function(port){
  reset(function(){

    player.request("/requests/status.json?command=in_play&input=http%3A%2F%2Flocalhost%3A" + port, function(err,status){
      playing = true;
    });
  });
}

exports.updateAddress = function(ip){
  var qrImg = qr.image(ip, {type:"png", size:10});
  var writeStream = fs.createWriteStream("./qr.png");
  var save = qrImg.pipe(writeStream);

  save.on('finish', function () {
    mergeImages([{ src: './splashNR.png', x: 0, y: 0 },
    { src: './qr.png', x: 1135, y: 900 }], {Canvas: Canvas}).then(function(b64){
      var base64Data = b64.replace(/^data:image\/png;base64,/, "");

      fs.writeFile("splashNR.png", base64Data, 'base64', function(err) {
        console.log(err);
      });
    });
  });
}



function reset(cb){
  player.request("/requests/status.json?command=pl_stop", function(err,status){
    player.request("/requests/status.json?command=pl_empty", function(err,status){
        playing = false;
        cb();
    });
  });
}
