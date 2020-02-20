const { parentPort } = require('worker_threads');

var torrentStream = require('torrent-stream');
var readTorrent = require('read-torrent');
var http = require('http');
var fs = require('fs');
var rangeParser = require('range-parser');
var xtend = require('xtend');
var url = require('url');
var mime = require('mime');
var pump = require('pump');

var engine;

var chosenFile;

var opts = {
  connections: 100,
	uploads: 10,
	tmp: '.',
  buffer: (1.5 * 1024 * 1024).toString(),
};

parentPort.on("message",function(msg){
  //console.log("Worker: ");
  //console.log(msg);
  if (msg.action == "start"){
      start(msg.data.magnet, msg.data.port);
  }else if (msg.action == "stop"){
      stop();
  }
});

function start(magnet, port) {
  readTorrent(magnet, function(err, torrent) {
    if (err){
      return parentPort.postMessage({action:"start",success:false});
    }

    engine = torrentStream(torrent, opts);

    engine.on('torrent', function(){
      console.log("Metadata fetched");
    });

    engine.on('download', function(index){
      console.log("Downloaded " + engine.swarm.downloaded + " - " + index);
    });

    engine.on('ready', function(){
      selectFile(engine.files);

      engine.listen(function(){
        console.log("Engine Started");

        engine.server = createServer(engine, {});
        engine.server.listen(port);

        return parentPort.postMessage({action:"start",success:true});
      });

    });
  });
};

function stop () {
  console.log("closing server");
  engine.server.close();
  console.log("destroying engine");
  engine.destroy(function(){});
  engine = null;
  return true;
};

function selectFile(files){
  chosenFile = files[0];

  files.forEach(function(file){
    file.deselect();
    if (file.length > chosenFile.length){
      chosenFile = file;
    }
  });

  chosenFile.select();
}

var createServer = function (e, opts) {
  var server = http.createServer();
  var index = e.files.indexOf(chosenFile);

  var onready = function () {
    e.files[index].select()
    server.index = e.files[index]
  }

  if (e.torrent) onready()
  else e.on('ready', onready)

  server.on('request', function (request, response) {
    var u = url.parse(request.url)
    var host = request.headers.host || 'localhost'
    // Allow CORS requests to specify arbitrary headers, e.g. 'Range',
    // by responding to the OPTIONS preflight request with the specified
    // origin and requested headers.
    if (request.method === 'OPTIONS' && request.headers['access-control-request-headers']) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
      response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      response.setHeader(
          'Access-Control-Allow-Headers',
          request.headers['access-control-request-headers'])
      response.setHeader('Access-Control-Max-Age', '1728000')

      response.end()
      return
    }

    if (request.headers.origin) response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
    if (u.pathname === '/') u.pathname = '/' + index

    if (u.pathname === '/favicon.ico') {
      response.statusCode = 404
      response.end()
      return
    }

    e.files.forEach(function (file, i) {
      if (u.pathname.slice(1) === file.name) u.pathname = '/' + i
    })

    var i = Number(u.pathname.slice(1))

    if (isNaN(i) || i >= e.files.length) {
      response.statusCode = 404
      response.end()
      return
    }

    var file = e.files[i]
    var range = request.headers.range
    range = range && rangeParser(file.length, range)[0]
    response.setHeader('Accept-Ranges', 'bytes')
    response.setHeader('Content-Type', mime.getType(file.name))
    response.setHeader('transferMode.dlna.org', 'Streaming')
    response.setHeader('contentFeatures.dlna.org', 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000')
    if (!range) {
      response.setHeader('Content-Length', file.length)
      if (request.method === 'HEAD') return response.end()
      pump(file.createReadStream(), response)
      return
    }

    response.statusCode = 206
    response.setHeader('Content-Length', range.end - range.start + 1)
    response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.length)
    if (request.method === 'HEAD') return response.end()
    pump(file.createReadStream(range), response)
  })

  server.on('connection', function (socket) {
    socket.setTimeout(36000000)
  })

  return server
}
