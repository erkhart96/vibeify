import React from 'react';
import { CLIENT_ID } from '../keys';

function LoginButton () {

    function authorizeApp () {
        let query = new URLSearchParams({
            response_type: "code",
            client_id: CLIENT_ID,
            scope: "user-library-read playlist-read-private",
            redirect_uri: "http://localhost:3000/index.html",
            state: genRandomString(20),
            // code_challenge_method: "S256",
            // code_challenge: "",
            show_dialog: true,
        })
        let url = `https://accounts.spotify.com/authorize?` + query;
        const loginPopup = window.open(url, 'popup', 'menubar=no,width=600,height=925');
        const checkPopup = setInterval(() => {
            if (loginPopup.window.location.href.includes("http://localhost:3000/index.html")) loginPopup.close();
            if (!loginPopup || !loginPopup.closed) return;
            clearInterval(checkPopup);
            window.location.href = loginPopup.window.location.href;
        }, 100);
    }

    function genRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const numPossible = possible.length;
        let randString = '';
        for (let i=0; i<length; ++i) {
            randString += possible.charAt(Math.floor(Math.random() * numPossible))
        }
        return randString;
    }

    return (
        <button onClick={authorizeApp}>login</button>
    )
}

export default LoginButton