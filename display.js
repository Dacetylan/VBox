const { spawn } = require("child_process");

const readline = require('readline');
var VLC = require('./vlc_wrapper.js');

var player;

exports.init = function(){
    player = new VLC("splash.png");
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
    });
  });
}



function reset(cb){
  player.request("/requests/status.json?command=pl_stop", function(err,status){
    player.request("/requests/status.json?command=pl_empty", function(err,status){
        cb();
    });
  });
}
