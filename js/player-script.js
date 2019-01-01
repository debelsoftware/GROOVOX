let _token = 0;
let firstBoot = true;
let player;
let playerReady = false;
let playerStarted = false;
let playerDeviceID;
let searchTracks;
let openSong = {
  "uri": "null",
  "name": "null",
  "artist": "null",
  "cover": "null"
}
let openid;
let status = "off";
const songNameLength = 17;
const artistNameLength = 25;
let popup = null;

let playlist = [];

localStorage.setItem('authToken', "NA");

document.getElementById('searchInput').addEventListener("keyup", function(event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    trackSearch();
  }
});

setInterval(function(){
  checkForToken();
}, 1000);

setInterval(function(){
  localStorage.setItem('authToken', "NA");
  getToken('refresh');
}, 900000);

function checkForToken(){
  if (localStorage.getItem('authToken') != "NA") {
    popup.close();
    _token = localStorage.getItem('authToken');
    console.log("got new token: ", _token);
    localStorage.setItem('authToken', "NA");
    if (!playerStarted) {
      startPlayer();
    }
  }
}

function getToken(status){
  const authEndpoint = 'https://accounts.spotify.com/authorize';
  const clientId = 'CLIENT ID HERE';
  const redirectUri = 'https://groovox.app/callback';
  const scopes = [
    'user-read-birthdate',
    'user-read-email',
    'user-read-private',
    'app-remote-control',
    'streaming'
  ];
  if (status = "init") {
    popup = window.open(
      `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join('%20')}&response_type=token`,
      'GROOVOX - Login with Spotify',
      'width=400,height=500'
    )
  }
  else {
    popup = window.open(
      `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join('%20')}&response_type=token`,
      'GROOVOX - Login with Spotify',
      'width=1,height=1'
    )
  }
}

/*
  INIT PLAYER
*/
window.onSpotifyWebPlaybackSDKReady = () => {
  playerReady = true;
};

function startPlayer(){
  player = new Spotify.Player({
    name: 'GROOVOX',
    getOAuthToken: cb => { cb(_token); }
  });
  player.addListener('initialization_error', ({ message }) => { console.error(message); });
  player.addListener('authentication_error', ({ message }) => { console.error(message); });
  player.addListener('account_error', ({ message }) => { console.error(message); });
  player.addListener('playback_error', ({ message }) => { console.error(message); });
  player.addListener('player_state_changed', state => {
    if (state.paused == true && state.position == 0 && state.disallows.pausing){
      skip();
    }
  });
  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    playerDeviceID = device_id;
    playerStarted = true;
    document.getElementById('search-results').innerHTML = "<h1>Ready to play! Search something</h1>";
  });
  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
    playerStarted = false;
  });
  player.connect();
}

//PLAY SONG
function playSong(song){
  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${playerDeviceID}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [song.uri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_token}`
      },
    });
  document.getElementById('playPause').src = "../img/pause.svg"
  document.getElementById('playing-cover').src = song.cover;
  if ((song.name).length > songNameLength){
    document.getElementById('playing-name').textContent = (song.name.substring(0, songNameLength)+"...");
  }
  else {
    document.getElementById('playing-name').textContent = song.name;
  }
  if ((song.artist).length > artistNameLength) {
    document.getElementById('playing-artist').textContent = (song.artist.substring(0, artistNameLength)+"...");
  }
  else {
    document.getElementById('playing-artist').textContent = song.artist;
  }
  status = "playing";
}

/*
  CHANGING TRACK
*/
function skip(){
  if (playlist.length > 0){
    console.log("Playing next song");
    playSong(playlist[0]);
    playlist.shift();
    updatePlaylistWindow();
  }
  else {
    status = "off";
    player.pause().then(() => {
      console.log('Stopped');
    });
    document.getElementById('playPause').src = "../img/play.svg";
    document.getElementById('playing-cover').src = "../img/defaultCover.jpg";
    document.getElementById('playing-name').textContent = "No song loaded";
    document.getElementById('playing-artist').textContent = "";
    updatePlaylistWindow();
  }
}

//Track search
function trackSearch(){
  let query = document.getElementById('searchInput').value;
  document.getElementById('searchInput').value = "";
  fetch('https://api.spotify.com/v1/search?q='+query+'&type=track&market=GB&limit=12', {
	   method: 'get',
     headers: {
       "authorization": "Bearer " + _token
     }
  }).then(function(response) { return response.json(); })
  .then(function(data) {
    searchTracks = data.tracks.items;
    populateTracks();
  })
  .catch(function(err) {
  });
}

//POPULATE TRACK LIST
function populateTracks(){
  let tracks = searchTracks;
  document.getElementById('search-results').innerHTML = "";
   for (let i = 0; i<tracks.length; i++){
     document.getElementById('search-results').innerHTML += '<div class="result" onclick="openPopup('+i+')"><img src="'+tracks[i].album.images[1].url+'" class="album-art" alt=""><div class="song-info"><p>'+tracks[i].name+'</p><p>'+tracks[i].album.artists[0].name+'</p></div></div>'
   }
}

function addToQueue(){
  if (status == "off" && playlist.length == 0){
    playSong(openSong);
    document.getElementById('search-results').innerHTML = "<h1>Playing that now. Why not search for another?</h1>";
  }
  else {
    playlist.push({
      "uri": openSong.uri,
      "name": openSong.name,
      "artist": openSong.artist,
      "cover": openSong.cover
    });
    document.getElementById('search-results').innerHTML = "<h1>I've added that for you. Why not search for another?</h1>";
  }
  closePopup();
  updatePlaylistWindow();
}

function closePopup(){
  document.getElementById('song-overlay').style.display = "none";
}

function openPopup(id){
  document.getElementById('song-overlay').style.display = "block";
  document.getElementById('song-cover').src = searchTracks[id].album.images[1].url;
  document.getElementById('song-name').textContent = searchTracks[id].name;
  document.getElementById('song-artist').textContent = searchTracks[id].album.artists[0].name;
  openSong.uri = searchTracks[id].uri;
  openSong.name = searchTracks[id].name;
  openSong.artist = searchTracks[id].album.artists[0].name;
  openSong.cover = searchTracks[id].album.images[1].url;
  openid = id;
}

function playPause(){
  if (status == "playing"){
    document.getElementById('playPause').src = "../img/play.svg";
    player.pause().then(() => {
      console.log('Paused');
    });
    status = "paused";
  }
  else if(status == "paused") {
    document.getElementById('playPause').src = "../img/pause.svg";
    player.resume().then(() => {
      console.log('Resumed');
    });
    status = "playing";
  }
}

function updatePlaylistWindow(){
  if (playlist.length > 0) {
    document.getElementById('playlist-window').innerHTML = "";
    for (let i = 0; i < playlist.length; i++){
      let name = playlist[i].name;
      let artist = playlist[i].artist;
      if ((playlist[i].name).length > songNameLength){
        name = playlist[i].name.substring(0, songNameLength) + "...";
      }
      if ((playlist[i].artist).length > artistNameLength) {
        artist = playlist[i].artist.substring(0, artistNameLength) + "...";
      }
      document.getElementById('playlist-window').innerHTML += '<div class="playlist-item"><img src="'+playlist[i].cover+'" alt=""><div class="playlist-item-info"><p>'+name+'</p><p>'+artist+'</p></div></div>';
    }
  }
  else {
    document.getElementById('playlist-window').innerHTML = "<p>No songs added yet</p>";
  }
}

function togglePlaylistWindow(){
  if (document.getElementById('playlist-window').style.display == "block"){
    document.getElementById('playlist-window').style.display = "none";
  }
  else {
    document.getElementById('playlist-window').style.display = "block";
  }
}
