'use strict'

var twitter = (function(){
  var files, creds, creds_twitter, oauthToken, oauthVerifier, twitter_account;

  var init = function(){
    files = undefined;
    creds = undefined;
    //creds_twitter = new CredentialsDB('twitter');
    //creds_twitter.onready = updateTwitterCredentials;

    // # Restore saved Twitter acc
    if (typeof localStorage.twitter_account !== 'undefined'){
      twitter_account = JSON.parse(localStorage.twitter_account);

      console.log('Twitter account restored:');
      console.log(twitter_account);
    }

  }

  var login = function(){
    console.log('Start Login Process');

    var urlCurrent = document.location.href;

    if(urlCurrent.indexOf('#oauth_token') !== -1){
      requestAccessToken();
      return false;
    }

    console.log('XHR(POST): https://api.twitter.com/oauth/request_token');
    processTwitterXHR(
      'https://api.twitter.com/oauth/request_token',
      'POST',
      {oauth_callback: 'http://hauste.krisztianvarga.co.uk/index_browser.php'},
      //{oauth_callback: 'http://hauste.krisztianvarga.co.uk/index_phone.php'},
      //{oauth_callback: 'http://hauste.krisztianvarga.co.uk/index.php'},
      function(xhr) {
        if (xhr.status != 200) {
          alert('Request refused:', xhr.status);
          return;
        }

        console.log('Response (From: https://api.twitter.com/oauth/request_token): '+xhr.responseText);

        if (xhr.responseText.match('oauth_token=')) {
          console.log('Extracting Twitter temporary token');

          var request_token_regex =
            new RegExp('oauth_token=(.*)&oauth_token_secret=.*');
          var request_token_ar = request_token_regex.exec(xhr.responseText);
          var request_token_full = request_token_ar[0];
          var request_token_only = request_token_ar[1];
          var authorize =
            'https://api.twitter.com/oauth/authorize?' + request_token_full;

          console.log('Open URL: ' + authorize);

          //window.open(authorize);
          document.location.href = authorize;

        }
      }
    );
  }

  var requestAccessToken = function(){
    fetchURL();

    console.log('XHR(POST): https://api.twitter.com/oauth/access_token');
    processTwitterXHR(
      'https://api.twitter.com/oauth/access_token',
      'POST',
      //{oauth_verifier: pin, oauth_token: request_token_only},
      {oauth_verifier: oauthVerifier, oauth_token: oauthToken},
      function(xhr) {
        if (xhr.status != 200) {
          alert(
            'Request refused:',
            xhr.status, '::',
            xhr.responseText);
          return;
        }

        console.log('Response (From: https://api.twitter.com/oauth/access_token): '+xhr.responseText);

        twitter.twitter_account =
          extractTwitterAccessToken(xhr.responseText);

        console.log('twitter_account:');
        console.log(twitter.twitter_account);

        localStorage.twitter_account = JSON.stringify(twitter.twitter_account);

      }
    );
  }

  var revoke = function(){
    console.log('Revoked')
    twitter.twitter_account = undefined;
    localStorage.clear();
  }

  var fetchURL = function(){
    console.log('Fetch data from URL');

    var urlCurrent = document.location.href;
    var urlArr = urlCurrent.split('#');
    var hash = urlArr[1];
    var hashArr = hash.split('&');
    var unfetchedOauthToken = hashArr[0];
    var unfetchedOauthVerifier = hashArr[1];
    var oauthTokenArr = unfetchedOauthToken.split('=');
    oauthToken = oauthTokenArr[1];
    var oauthVerifierArr = unfetchedOauthVerifier.split('=');
    oauthVerifier = oauthVerifierArr[1];
    console.log('oauthToken: '+oauthToken);
    document.location.hash = '';

  }

  var processTwitterXHR = function(url, method, params, callback) {
    var target_url = buildTwitterURL(url, method, params);
    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open(method, target_url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        callback(xhr);
      }
    };
    xhr.send();
  }

  var buildTwitterURL = function (url, method, parameters) {
    var accessor = {
      token: null,
      tokenSecret: null,
      consumerKey: 'Rn0NIIGsCXW9piQXIS3A',
      consumerSecret: 's1p5qqW4LI20fvWU2NlcQkn5hkBeEuEMPhh95zgwxo'
    };

    /*
    if (creds.length > 0) {
      accessor.token = creds[0].oauth_token;
      accessor.tokenSecret = creds[0].oauth_token_secret;
    }
    */

    /*
    if(typeof oauthToken != 'undefined' && typeof oauthVerifier != 'undefined'){
      console.log('token & secret are updated');
      accessor.token = oauthToken;
      accessor.tokenSecret = oauthToken;
    }
    */

    // # Add saved twitter acc details
    if (typeof twitter.twitter_account !== 'undefined'){
      accessor.token = twitter.twitter_account.oauth_token;
      accessor.tokenSecret = twitter.twitter_account.oauth_token_secret;
    }

    console.log('accessor:');
    console.log(accessor);

    var message = {
      action: url,
      method: method,
      parameters: parameters
    };

    OAuth.completeRequest(message, accessor);
    OAuth.SignatureMethod.sign(message, accessor);
    message.parameters
    console.log(message);
    //alert('message.parameters: ' + JSON.stringify(message.parameters));
    return url + '?' + OAuth.formEncode(message.parameters);
  }

  var extractTwitterAccessToken = function(string) {
    var res = {};
    var ar = string.split('&');
    for (var id in ar) {
      var param = ar[id].split('=');
      res[param[0]] = param[1];
    }
    return res;
  }





  var upload = function(msg){
    console.log('Start upload process..');

    var twstatus = msg;

    if (typeof twitter.twitter_account == 'undefined'){
      twitter.login();
      return false;
    }

    var url = buildTwitterURL(
      'https://api.twitter.com/1/statuses/update.json',
      //'https://upload.twitter.com/1/statuses/update_with_media.json',
      'POST',
      {include_entities: true, status: twstatus}
    );

    //var picture = new FormData();
    //picture.append('media', 'http://hauste.krisztianvarga.co.uk/profile_pic.jpg');

    //XHRUpload(url, picture, function(xhr) {
    XHRUpload(url, null, function(xhr) {
      var json = JSON.parse(xhr.responseText);
      var id_str = json.entities.media[0].id_str;
      var ex_url = json.entities.media[0].expanded_url;
      console.log('xhr.responseText: ' + xhr.responseText);
      //setStatus('Uploaded successfully: ' + id_str);
      callback(ex_url);
    });
  }

  var XHRUpload = function (url, data, callback) {
    console.log('Ready to upload');

    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('POST', url, true);
    xhr.upload.addEventListener('progress', function(e) {
      if (e.lengthComputable) {
        setProgress(e.loaded, e.total);
      }
    }, false);
    xhr.upload.addEventListener('load', function(e) {
        setProgress(e.loaded, e.total);
    }, false);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        console.log('Uploaded, treating response.');
        callback(xhr);
      }
    };
    xhr.send(data);
    console.log('Uploading ...');
  }





  init();

  return {
    login: login,
    twitter_account: twitter_account,
    upload: upload,
    revoke: revoke
  }
}());

window.onload = function(){
  // # User needs to login first if not logged in yet
  if (typeof twitter.twitter_account == 'undefined'){
    twitter.login();
  }

  // # Setup input
  var btnSend = document.querySelector('#btnSend');
  var msgInput = document.querySelector('#msgInput');
  btnSend.addEventListener('click', function(){
    twitter.upload(msgInput.value);
  }, false);

  var btnRevoke = document.querySelector('#btnRevoke');
  btnRevoke.addEventListener('click', function(){
    twitter.revoke();
  }, false);

}

function test(){
  //var picture = new FormData();
  //picture.append('media', 'http://hauste.krisztianvarga.co.uk/profile_pic.jpg');
  var img = new Image();
  img.src = 'http://hauste.krisztianvarga.co.uk/profile_pic.jpg';
  document.body.appendChild(img);
}