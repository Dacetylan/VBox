const { spawn } = require("child_process");
var omx = require('omxctrl');
const readline = require('readline');

var fim;

exports.init = function(){
    setSplash();

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', (key, data) => {
      if (data.ctrl && data.name === 'c') {
        reset();
        process.exit(0);
      } else {
        //console.log('key', key);
      }
    });
}

exports.resetPlayer = function(){
  resetPlayer();
  setSplash();
}

function resetPlayer(){
  omx.stop();
}

function reset(){
  resetPlayer();
  if (fim){
    fim.kill('SIGINT');
    fim = null;
  }
}

function setSplash(){
  fim = spawn("fim", ["-a","-q","splash.png"]);
}

exports.play = function(port){
  reset();
  omx.play("http://localhost:" + port, ['-o hdmi','--display 2']);
}
