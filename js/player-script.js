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
let lastSong;
let currentSong;
let logCount = 0;
let posting = false;
let partyMode = false;

let backgroundPlaylist = false;
let currentBgTrack = -1;
let bgTracks;

/*
let bpmTimer = setInterval(test, 1000);
let currentColour = 0;
let colours = ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
		  '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
		  '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A',
		  '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
		  '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC',
		  '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
		  '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680',
		  '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
		  '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3',
		  '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF']

function test(){
  if (partyMode) {
    document.getElementById('all').style.background = `linear-gradient(90deg, ${colours[currentColour]} 0%, rgba(18,18,18,1) 25%, rgba(18,18,18,1) 75%, ${colours[currentColour]} 100%)`;
    currentColour
    if (currentColour+1 == colours.length) {
      currentColour = 0;
    }
    else {
      currentColour++
    }
  }
}
*/

let urlParams = new URLSearchParams(window.location.search);

localStorage.setItem('authToken', "NA");

document.getElementById('searchInput').addEventListener("keyup", function(event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    trackSearch();
  }
});

document.getElementById('search-overlay').addEventListener('click', function(){
  document.getElementById('search-overlay').style.display = "none";
});

document.getElementById('song-overlay').addEventListener('click', function(){
  document.getElementById('song-overlay').style.display = "none";
})

document.getElementById('tapstart').addEventListener('click', function(){
  document.getElementById('tapstart').style.display = "none"
  getBackgroundTracks()
})

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
  const redirectUri = 'DOMAIN HERE/callback';
  const scopes = [
    'user-read-birthdate',
    'user-read-email',
    'user-read-private',
    'app-remote-control',
    'streaming'
  ];
  if (status = "init") {
    if (urlParams.get('hideSkip') == "true") {
      document.getElementById('skip').style.display = "none";
    }
    if (urlParams.get('hidePause') == "true") {
      document.getElementById('playPause').style.display = "none";
    }
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
    logCount++
    //console.log(`${logCount}, URI:${state.track_window.current_track.uri}, currentSong:${currentSong}, lastSong:${lastSong}`);
    //console.log(state);
    //console.log(`${posting}`);
    if (state.paused == true && state.position == 0 && state.disallows.pausing){
      player.pause().then(() => {
        console.log("skipping!!!");
        lastSong = currentSong;
        skip();
      });
    }
  });
  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    playerDeviceID = device_id;
    playerStarted = true;
    document.getElementById('tapstart').style.display = "table";
    document.getElementById('warnings').style.display = "none";
    document.getElementById('below-search').style.display = "block";
    getPlaylists();
  });
  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
    playerStarted = false;
  });
  player.connect();
}

function getBackgroundTracks(){
  if (urlParams.get('bgPlaylist') != null && urlParams.get('bgPlaylist') != "") {
    fetch(`https://api.spotify.com/v1/playlists/${urlParams.get('bgPlaylist').substring(17)}/tracks`, {
  	   method: 'get',
       headers: {
         "authorization": "Bearer " + _token
       }
    }).then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.items.length == 0) {
        alert("Failed to load background playlist")
      }
      else {
        backgroundPlaylist = true
        bgTracks = data.items;
        skip();
      }
    })
    .catch(function(err) {
      alert("Failed to load background playlist")
    });
  }
  else {
    console.log("no bg playlist");
  }
}

//PLAY SONG
function playSong(song, shiftOnComplete){
  currentSong = song.uri;
  posting = true;
  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${playerDeviceID}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [song.uri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_token}`
      },
    }).then(function(response) {
      if (response.status != 204){
        console.log("error with that song");
        skip();
      }
    })
    .then(function (){
      posting = false
      //getBars(song.uri.substring(14))
      if (shiftOnComplete) {
        console.log("posted");
        playlist.shift();
        updatePlaylistWindow();
      }
    })
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
    playSong(playlist[0], true);
  }
  else {
    if (backgroundPlaylist) {
      console.log("Playing BG song");
      currentBgTrack++
      if (currentBgTrack >= bgTracks.length) {
        currentBgTrack = 0
      }
      let bgSong = bgTracks[currentBgTrack]
      playSong({
        "uri": bgSong.track.uri,
        "name": bgSong.track.name,
        "artist": bgSong.track.artists[0].name,
        "cover": bgSong.track.album.images[0].url
      })
    }
    else {
      status = "off";
      console.log("ended");
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
}

//Load Playlists
function getPlaylists(){
  fetch('https://api.spotify.com/v1/browse/featured-playlists', {
	   method: 'get',
     headers: {
       "authorization": "Bearer " + _token
     }
  }).then(function(response) { return response.json(); })
  .then(function(data) {
    populatePlaylists(data,1)
  })
  .catch(function(err) {
  });
  fetch('https://api.spotify.com/v1/browse/categories/party/playlists', {
	   method: 'get',
     headers: {
       "authorization": "Bearer " + _token
     }
  }).then(function(response) { return response.json(); })
  .then(function(data) {
    populatePlaylists(data,2);
  })
  .catch(function(err) {
  });
  fetch('https://api.spotify.com/v1/browse/categories/mood/playlists', {
	   method: 'get',
     headers: {
       "authorization": "Bearer " + _token
     }
  }).then(function(response) { return response.json(); })
  .then(function(data) {
    populatePlaylists(data,3);
  })
  .catch(function(err) {
  });
}

function populatePlaylists(playlistData,slot){
  if (slot == 1) {
    for (let playlist of playlistData.playlists.items){
      let album = document.createElement('img');
      album.classList.add('playlist');
      album.src = playlist.images[0].url;
      album.addEventListener("click", function(){
        openPlaylist(playlist.id)
      })
      document.getElementById('featured').appendChild(album)
    }
  }
  else if (slot == 2){
    for (let playlist of playlistData.playlists.items){
      let album = document.createElement('img');
      album.classList.add('playlist');
      album.src = playlist.images[0].url;
      album.addEventListener("click", function(){
        openPlaylist(playlist.id)
      })
      document.getElementById('party').appendChild(album)
    }
  }
  else if (slot == 3){
    for (let playlist of playlistData.playlists.items){
      let album = document.createElement('img');
      album.classList.add('playlist');
      album.src = playlist.images[0].url;
      album.addEventListener("click", function(){
        openPlaylist(playlist.id)
      })
      document.getElementById('mood').appendChild(album)
    }
  }
}

/*
function getBars(id){
  clearTimeout(bpmTimer);
  fetch(`https://api.spotify.com/v1/audio-analysis/${id}`, {
	   method: 'get',
     headers: {
       "authorization": "Bearer " + _token
     }
  }).then(function(response) { return response.json(); })
  .then(function(data) {
    bpmTimer = setInterval(test, 1000/(data.track.tempo/60));
  })
  .catch(function(err) {
    console.log(err);
  });
}


document.onkeydown = checkKey;


function checkKey(e) {
    e = e || window.event;
    if (e.keyCode == '38') {
        if (partyMode) {
          partyMode = false;
        }
        else {
          partyMode = true;
        }
    }
}
*/

function openPlaylist(id){
  fetch(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
	   method: 'get',
     headers: {
       "authorization": "Bearer " + _token
     }
  }).then(function(response) { return response.json(); })
  .then(function(data) {
    searchTracks = [];
    for (let dataTrack of data.items){
      searchTracks.push(dataTrack.track);
    }
    document.getElementById('search-overlay').style.display = "block";
    document.getElementById('search-results').style.display = "block";
    document.getElementById('search-results').scrollTo(0,0);
    populateTracks();
  })
  .catch(function(err) {
    console.log(err);
  });
}

//Track search
function trackSearch(){
  let query = document.getElementById('searchInput').value;
  document.getElementById('searchInput').value = "";
  fetch('https://api.spotify.com/v1/search?q='+query+'&type=track&limit=12', {
	   method: 'get',
     headers: {
       "authorization": "Bearer " + _token
     }
  }).then(function(response) { return response.json(); })
  .then(function(data) {
    console.log(data.tracks.items);
    searchTracks = data.tracks.items;
    document.getElementById('search-overlay').style.display = "block";
    document.getElementById('search-results').style.display = "block";
    document.getElementById('search-results').scrollTo(0,0);
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
  document.getElementById('search-overlay').style.display = "none";
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
