
var socket = io("http://" + window.location.hostname + ":2000");

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
