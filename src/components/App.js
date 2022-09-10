import '../App.css';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoginButton from './LoginButton';
import { Base64 } from 'js-base64';
import { CLIENT_ID, CLIENT_SECRET } from '../keys';


function App() {

  const [searchParams] = useSearchParams();
  let accessToken = '';

  useEffect(() => {
    if (searchParams.get('code')) fetchAccessToken();
  }, []);

  function fetchAccessToken () {
    console.log('fetching access token ...');
    const query = new URLSearchParams({
      grant_type: "authorization_code",
      code: searchParams.get('code'),
      redirect_uri: "http://localhost:3000/index.html",
      client_id: CLIENT_ID,
    });
    const url = `https://accounts.spotify.com/api/token?` + query;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Base64.encode(CLIENT_ID + ':' + CLIENT_SECRET).toString()
      },
      body: query,
    })
    .then(r => r.json())
    .then(data => {
      // set tokens
      accessToken = data.access_token;
      // refreshToken = data.refresh_token;
      // calc & set time to refresh
      let now = new Date()
      // expiration = now.setSeconds(now.getSeconds() + data.expires_in);
    })
    .then(() => {
      fetchUserLibrary();
    })
    .catch(error => console.log(error))
  }

  function fetchUserLibrary () {
    console.log('fetching user library ...');
    const url = "https://api.spotify.com/v1/me/tracks";
    fetch (url, {
      headers: {
        "Authorization": 'Bearer ' + accessToken,
        "Content-Type": "application/json"
      }
    })
    .then(r => r.json())
    .then(data => {
      console.log(data);
      let limit = data.limit;
      let numFetch = Math.ceil(data.total / data.limit) - 1;
      for (let i=0; i<numFetch; ++i) {
        const query = new URLSearchParams({
          offset: limit * i,
        })
        const url = `https://api.spotify.com/v1/me/tracks?` + query;
        fetch(url, {
          headers: {
            "Authorization": 'Bearer ' + accessToken,
            "Content-Type": "application/json"
          }
        })
        .then(r => r.json())
        .then(data => {
          console.log(data);
          // store data into local server
        })
      }
    })
  }

  return (
    <div className="App">
      <header className="App-header">
        <LoginButton />
      </header>
    </div>
  );
}

export default App;
