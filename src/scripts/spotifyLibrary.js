import noAlbumArt from '../No-album-art.png'

export function getSpotifyLibrary () {

    console.log('getting spotify library...');

    let accessToken = localStorage.getItem("access_token");
    let userId = localStorage.getItem("user_id");

    let songIdAry = [];
    loadLocalSongIds();

    function fetchAudioFeatures (songId) {
        const url = `https://api.spotify.com/v1/audio-features/${songId}`;
        return fetch(url, {
            headers: {
                "Authorization": 'Bearer ' + accessToken,
                "Content-Type": "application/json"
            }
        })
        .then(r => r.json())
        .then(data => {return data});
    }

    async function fetchAudioFeaturesForLibrary () {
        console.log('fetching audio features ...');
        const library = await fetch("http://localhost:3001/songs").then(r => r.json());
        const done = await library.map(async (song) => {
            if (!song.audio_features) {
                const audioFeatures = await fetchAudioFeatures(song.id);
                const patchSong = {
                    ...song,
                    "audio_features": {...audioFeatures}
                }
            const update = patchSongOnLocal(patchSong);
            return update;
            }
        })
        return Promise.all(done);
    }

    async function fetchData (apiUrl, info) {
        // setup return object
        let data = [];
        // check apiUrl has query character at end
        if (apiUrl.charAt(apiUrl.length - 1) !== '?') {apiUrl += '?'}
        // call to API
        const limit = 20;
        const numCalls = Math.ceil(info.total / limit);
        for (let i = 0; i < numCalls; ++i) {
            const query = new URLSearchParams({
                offset: limit * i,
            })
            const fetchUrl = apiUrl + query;
            await fetch(fetchUrl, {
                headers: {
                "Authorization": 'Bearer ' + accessToken,
                "Content-Type": "application/json"
                }
            })
            .then(r => r.json())
            .then(f => data.push(f))
        }
        return data;
    }
    
    function fetchInfo (apiUrl) {
        const url = apiUrl + "?limit=1";
        return fetch (url, {
            headers: {
                "Authorization": 'Bearer ' + accessToken,
                "Content-Type": "application/json"
            }
        })
        .then(r => r.json())
        .then(data => {return data})
    }

    function fetchTracksForPlaylist (playlistApiUrl) {
        return fetch(playlistApiUrl, {
            headers: {
                "Authorization": 'Bearer ' + accessToken,
                "Content-Type": "application/json"
            }
        })
        .then(r => r.json())
        .then(data => {return data.items})
    }

    async function fetchTracksForPlaylistAry (playlistAry) {
        let playlistTracksAry = [];
        playlistAry.forEach(playlist => {
            playlistTracksAry.push(fetchTracksForPlaylist(playlist.tracks.href));
        });
        playlistTracksAry = await Promise.all(playlistTracksAry);
    
        const totalTrackAry = [];
        playlistTracksAry.forEach(playlist => {
            playlist.forEach(entry => {
                totalTrackAry.push(entry.track);
            })
        })
        return totalTrackAry;
    }

    async function fetchUserLibrary () {
        console.log('fetching user library...');
        await fetchUserLikedSongs();
        await fetchUserPlaylists();
        await fetchAudioFeaturesForLibrary();
    }

    async function fetchUserLikedSongs () {
        console.log('fetching liked songs...');
        const apiUrl = "https://api.spotify.com/v1/me/tracks";
        const infoObj = await fetchInfo(apiUrl);
        const dataAry = await fetchData(apiUrl, infoObj);
        let likedSongsAry = [];
        dataAry.forEach(entry => {
            entry.items.forEach(item => {
                likedSongsAry.push(item.track);
            })
        });
        likedSongsAry = parseSpotifyTracksAry(likedSongsAry);
        await postSongsAryToLocal(likedSongsAry);
        return true;
    }

    async function fetchUserPlaylists () {
        console.log('fetching playlits...');
        const apiUrl = "https://api.spotify.com/v1/me/playlists";
        const info = await fetchInfo(apiUrl);
        const dataAry = await fetchData(apiUrl, info);
    
        let playlistsAry = [];
        dataAry.forEach(entry => playlistsAry.push(...(entry.items)));
        playlistsAry = playlistsAry.filter(playlist => playlist.owner.id === userId);
        let allTracksAry = await fetchTracksForPlaylistAry(playlistsAry);
        
        allTracksAry = parseSpotifyTracksAry(allTracksAry);
        await postSongsAryToLocal(allTracksAry);
        return true;
    }

    function loadLocalSongIds () {
        fetch(`http://localhost:3001/songs`)
        .then(r => r.json())
        .then(library => {
            library.forEach(song => songIdAry.push(song.id))
        })
    }

    function parseSpotifyTracksAry (tracksAry) {
        const songsAry = [];
        tracksAry.forEach(track => {
                let albumEntry = {
                'id': null,
                'name': track.album.name,
                'url': null,
                'imageUrl': [noAlbumArt]
                }

                if (!track.is_local) {
                albumEntry = {...albumEntry,
                    'id': track.album.id,
                    'url': track.album.external_urls.spotify,
                    'imageUrl': track.album.images[0].url
                }
            }

            const artistsAry = track.artists.map(artist => {
                return {
                    "id": artist.id,
                    "name": artist.name,
                    "url": artist.external_urls.spotify,
                }
            })
            const songEntry = {
                "id": track.id,
                "name": track.name,
                "album": albumEntry,
                "artists": artistsAry,
                "url": track.external_urls.spotify,
            }
            songsAry.push(songEntry);
        })
        return songsAry;
    }

    async function patchSongOnLocal (patchSong) {
        const url = `http://localhost:3001/songs/${patchSong.id}`
        return await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(patchSong)
        })
        .then(r => r.json())
        .then(patch => {return patch});
    }

    async function postSongsAryToLocal (songsAry) {
        await songsAry.forEach(song => {
            postSongToLocal(song);
            songIdAry.push(song.id);
        });
        return true;
    }
    
    async function postSongToLocal (song) {
        if (!songIdAry.find(ele => ele === song.id)) {
            await fetch(`http://localhost:3001/songs`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(song),
            });
        }
    }

    return fetchUserLibrary();

}