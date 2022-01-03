'use strict';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-button').addEventListener('click', () => {
        window.location.href= 'https://login.uber.com/oauth/v2/authorize?response_type=code&client_id=<Er0P1VIuDlm1CCfxQbVqgz7mu7eLlKjP>&redirect_uri=<https://localhost:3001/>&scope=partner.trips'
        //window.location.href='https://w3docs.com';
    });
});
