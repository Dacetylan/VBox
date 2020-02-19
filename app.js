var tdisplay = require("./tdisplay.js");
const express = require('express');
const app = express();
var cors = require('cors');
var readTorrent = require('read-torrent');
var peerflix = require('peerflix');
var path = require('path');
var fs = require('fs');


var tempDir = "./torrents";
var engine;

const port = 3000

tdisplay.init();

function reset(){
  if(engine){
    engine.destroy();
    engine = null;
  }

  tdisplay.resetPlayer();
}


app.use(cors());
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile('index.html');
});

app.get('/loadMagnet', async function (req, res) {
  var magnet = req.query.url;

  await readTorrent(magnet, function(err, torrent) {
   if (err) return res.send(400, { error: 'torrent link could not be parsed' });

   reset();

   engine = peerflix(torrent, {
      connections: 100,
      tmp: tempDir,
      buffer: (1.5 * 1024 * 1024).toString()
    });

    engine.server.on('listening', function() {
      console.log("torrent loaded on port " + engine.server.address().port);
      res.send("Torrent loaded and ready to play");
    });

  });

});

app.get('/play', function (req, res) {

  if (engine == null){
    res.send("There is nothing to play");
  }

  tdisplay.play(engine);

  res.send("Started playing");
});


app.listen(port, () => console.log(`Vbox listening on port ${port}!`));
