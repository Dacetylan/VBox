
var socket = io("http://" + window.location.hostname + ":2000");
var yts_api = "https://yts.mx/api/v2/";


function get(id){
  return document.getElementById(id);
}

var updatevidrng = true;
var updatevolrng = true;

function formatTime(seconds){
  return new Date(seconds * 1000).toISOString().substr(11, 8);
}

var vidrange = get("vidrange");
var vidPos = get("vidPos");

// Update the current slider value (each time you drag the slider handle)
vidrange.oninput = function() {
  vidPos.innerHTML = formatTime(this.value);
  updatevidrng = false;
}

var volrange = get("volrange");
var volPos = get("volPos");

// Update the current slider value (each time you drag the slider handle)
volrange.oninput = function() {
  volPos.innerHTML = "Volume: " + this.value +"%";
  updatevolrng = false;
}

socket.on('disconnect', (reason) => {
  window.history.back();
});

var vidData;

function loadMagnet(){
  socket.emit('loadMagnet', get("magnet").value);
  get("chose").style.display = "none";
}

socket.on('engineReady', (data) => {
  get("chose").style.display = "none";
  get("startPlay").style.display = "initial";
  get("info").style.display = "initial";

  get("title").innerHTML = "Streaming: " + data.name;
  vidData = data;
});

var fetchInt;

var playing = false;

function startPlayer(){
  socket.emit('startPlayer', "");
  fetchInt = setInterval(playbackFeth,1000);
}

function playbackFeth(){
  socket.emit("playbackData","");
}

socket.on('playbackData', (data) => {

  vidrange.max = data.length;
  get("vidMax").innerHTML = formatTime(data.length);

  if (updatevidrng){
    vidrange.value = data.time;
    vidPos.innerHTML = formatTime(data.time);
  }

  if (updatevolrng){
    volrange.value = Math.floor(data.volume / 256 * 100);
    volPos.innerHTML = "Volume: " + volrange.value +"%";
  }

  if (playing == false){
    get("startPlay").style.display = "none";
    get("controls").style.display = "initial";
    playing = true;
  }
});

function btomb(bytes){
  return bytes / 1000000;
}

function rounddigits(input, amount){
   return Math.floor(input * Math.pow(10,amount)) / Math.pow(10,amount);
}

socket.on('torrentData', (data) => {
  get("downloaded").placeholder = rounddigits(btomb(data.downloaded),3) + " mb / " + rounddigits(btomb(vidData.vidLen),0) + " mb";
  get("downloadspd").placeholder = rounddigits(btomb(data.downloadSpeed),3) + " mb/s";
  get("uploaded").placeholder = rounddigits(btomb(data.uploaded),3) + " mb";
  get("uploadspd").placeholder = rounddigits(btomb(data.uploadSpeed),3) + " mb/s";
});

function stopPlayer(){
  clearInterval(fetchInt);
  socket.emit('stopPlayer', "");
  get("startPlay").style.display = "none";
  get("controls").style.display = "none";
  get("info").style.display = "none";
  get("chose").style.display = "initial";
  setTimeout(function(){playing = false;},1000);
}

function playerPause(){
  socket.emit('playerPause', "");
}

function seekRel(sec, type){
  socket.emit('playerSeekRel', {type:type,amount:sec});
}

vidrange.onchange = function() {
  updatevidrng = true;
  socket.emit('playerSeek', this.value);
}

volrange.onchange = function() {
  updatevolrng = true;
  socket.emit('playerVol', this.value/100 * 256);
}

function loadTor(el){
  var link = el.getAttribute("torlink");
  socket.emit('loadMagnet', link);
  get("chose").style.display = "none";
}


function search(){
get("results").innerHTML = "";
var name = get("movie").value;
var request = yts_api + "list_movies.json" + "?query_term=" + encodeURI(name);

$.get(request, function(result, status){

  var data = result.data;
  for (var i=0; i<data.movies.length; i++){
    var movdata = data.movies[i];
    console.log(movdata);

    var row = document.createElement( 'div' );
    row.setAttribute("class", "row");

    var imgCol = document.createElement( 'div' );
    imgCol.setAttribute("class","col-sm-12 cold-md-4");
    var img = document.createElement("img");
    img.setAttribute("src", movdata.medium_cover_image);
    imgCol.appendChild(img);
    row.appendChild(imgCol);

    var descCol = document.createElement( 'div' );
    descCol.setAttribute("class","col-sm-12 cold-md-8");

    var titleRow = document.createElement( 'div' );
    titleRow.setAttribute("class","row");

    var title = document.createElement( 'h3' );
    title.innerHTML = movdata.title_long;
    titleRow.appendChild(title);

    var descRow = document.createElement( 'div' );
    descRow.setAttribute("class","row");

    var desc = document.createElement( 'h4' );
    desc.innerHTML = movdata.summary;
    descRow.appendChild(desc);

    descCol.appendChild(titleRow);
    descCol.appendChild(descRow);

    var torCol = document.createElement( 'div' );
    torCol.setAttribute("class","col-sm-12");

    for (var j=0; j < movdata.torrents.length; j++){
      var tordat = movdata.torrents[j];
      var torRow = document.createElement( 'div' );
      torRow.setAttribute("class","row");

      var qCol = document.createElement( 'div' );
      qCol.setAttribute("class","col-sm-3");
      qCol.style.textAlign = "left";

      var q = document.createElement( 'input' );
      q.setAttribute("type","button");
      q.setAttribute("value", tordat.quality + " " + tordat.type);
      q.setAttribute("torlink", tordat.url);
      q.setAttribute("onclick", "loadTor(this)");
      q.style.width = "100%";
      q.style.whiteSpace = "normal";
      q.style.wordWrap = "break-word";
      qCol.appendChild(q);

      torRow.appendChild(qCol);

      var seedsCol = document.createElement( 'div' );
      seedsCol.setAttribute("class","col-sm-3");
      seedsCol.style.textAlign = "center";

      var seeds = document.createElement( 'h5' );
      seeds.innerHTML = "Seeders: " + tordat.seeds;
      seedsCol.appendChild(seeds);

      torRow.appendChild(seedsCol);

      var peersCol = document.createElement( 'div' );
      peersCol.setAttribute("class","col-sm-3");
      peersCol.style.textAlign = "center";

      var peers = document.createElement( 'h5' );
      peers.innerHTML = "Peers: " + tordat.peers;
      peersCol.appendChild(peers);

      torRow.appendChild(peersCol);

      var sizeCol = document.createElement( 'div' );
      sizeCol.setAttribute("class","col-sm-3");
      sizeCol.style.textAlign = "center";

      var size = document.createElement( 'h5' );
      size.innerHTML = tordat.size;
      sizeCol.appendChild(size);

      torRow.appendChild(sizeCol);


      torCol.appendChild(torRow);
    }

    row.appendChild(descCol);
    row.appendChild(torCol);


    get("results").appendChild( row );
  }

});
}
