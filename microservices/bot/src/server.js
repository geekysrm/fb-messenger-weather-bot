var request = require('request');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();

let mdb = require('moviedb')(process.env.MOVIE_DB_TOKEN);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

let FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
let FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
let FACEBOOK_SEND_MESSAGE_URL = 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FACEBOOK_PAGE_ACCESS_TOKEN;
let MOVIE_DB_PLACEHOLDER_URL = 'http://image.tmdb.org/t/p/w185/';
let MOVIE_DB_BASE_URL = 'https://www.themoviedb.org/movie/';

//your routes here
app.get('/', function (req, res) {
    res.send("Hello World, I am a bot.")
});

app.get('/webhook/', function(req, res) {
  if (req.query['hub.verify_token'] === FACEBOOK_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge'])
        return;
    }
    res.send('Error, wrong token')
});

app.post('/webhook/', function(req, res) {
  console.log(JSON.stringify(req.body));
  if (req.body.object === 'page') {
    if (req.body.entry) {
      req.body.entry.forEach(function(entry) {
        if (entry.messaging) {
          entry.messaging.forEach(function(messagingObject) {
              var senderId = messagingObject.sender.id;
              if (messagingObject.message) {
                if (!messagingObject.message.is_echo) {
                  //Assuming that everything sent to this bot is a movie name.
                  var movieName = messagingObject.message.text;
                  getMovieDetails(senderId, movieName);
                }
              } else if (messagingObject.postback) {
                console.log('Received Postback message from ' + senderId);
              }
          });
        } else {
          console.log('Error: No messaging key found');
        }
      });
    } else {
      console.log('Error: No entry key found');
    }
  } else {
    console.log('Error: Not a page object');
  }
  res.sendStatus(200);
})

function sendUIMessageToUser(senderId, elementList) {
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: elementList
          }
        }
      }
    }
  }, function(error, response, body) {
        if (error) {
          console.log('Error sending UI message to user: ' + error.toString());
        } else if (response.body.error){
          console.log('Error sending UI message to user: ' + JSON.stringify(response.body.error));
        }
  });
}

function sendMessageToUser(senderId, message) {
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      message: {
        text: message
      }
    }
  }, function(error, response, body) {
        if (error) {
          console.log('Error sending message to user: ' + error);
        } else if (response.body.error){
          console.log('Error sending message to user: ' + response.body.error);
        }
  });
}

function showTypingIndicatorToUser(senderId, isTyping) {
  var senderAction = isTyping ? 'typing_on' : 'typing_off';
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      sender_action: senderAction
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending typing indicator to user: ' + error);
    } else if (response.body.error){
      console.log('Error sending typing indicator to user: ' + response.body.error);
    }
  });
}

function getElementObject(result) {
  var movieName  = result.original_title
  var overview = result.overview;
  var posterPath = MOVIE_DB_PLACEHOLDER_URL + result.poster_path;
  return {
    title: movieName,
    subtitle: overview,
    image_url: posterPath,
    buttons: [
        {
          type: "web_url",
          url: MOVIE_DB_BASE_URL + result.id,
          title: "View more details"
        }
    ]
  }
}

function getMovieDetails(senderId, movieName) {
  showTypingIndicatorToUser(senderId, true);
  var message = 'Found details on ' + movieName;
  mdb.searchMovie({ query: movieName }, (err, res) => {
    showTypingIndicatorToUser(senderId, false);
    if (err) {
      console.log('Error using movieDB: ' + err);
      sendMessageToUser(senderId, 'Error finding details on ' + movieName);
    } else {
      console.log(res);
      if (res.results) {
        if (res.results.length > 0) {
          var elements = []
          var resultCount =  res.results.length > 5 ? 5 : res.results.length;
          for (i = 0; i < resultCount; i++) {
            var result = res.results[i];
            elements.push(getElementObject(result));
          }
          sendUIMessageToUser(senderId, elements);
        } else {
          sendMessageToUser(senderId, 'Could not find any informationg on ' + movieName);
        }
      } else {
        sendMessageToUser(senderId, message);
      }
    }
  });
}


app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});
