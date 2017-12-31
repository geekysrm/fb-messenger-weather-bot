var request = require('request');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();

let OPEN_WEATHER_TOKEN = process.env.OPEN_WEATHER_TOKEN;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
let FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
let FACEBOOK_SEND_MESSAGE_URL = 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FACEBOOK_PAGE_ACCESS_TOKEN;
let MOVIE_DB_PLACEHOLDER_URL = 'http://image.tmdb.org/t/p/w185/';
let MOVIE_DB_BASE_URL = 'https://www.themoviedb.org/movie/';
let WEATHER_BASE_URL = 'http://api.openweathermap.org/data/2.5/weather?units=imperial&APPID=';

//your routes here
app.get('/', function (req, res) {
  res.send("Hello World, I am a facebook bot.")
});

app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === FACEBOOK_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge'])
    return;
  }
  res.send('Error, wrong token')
});

app.post('/webhook/', function (req, res) {
  console.log(JSON.stringify(req.body));
  if (req.body.object === 'page') {
    if (req.body.entry) {
      req.body.entry.forEach(function (entry) {
        if (entry.messaging) {
          entry.messaging.forEach(function (messagingObject) {
            var senderId = messagingObject.sender.id;
            if (messagingObject.message) {
              if (!messagingObject.message.is_echo) {
                //Assuming that everything sent to this bot is a city name.
                var cityName = messagingObject.message.text;
                getCityWeather(senderId, cityName);
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
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending UI message to user: ' + error.toString());
    } else if (response.body.error) {
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
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending message to user: ' + error);
    } else if (response.body.error) {
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
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending typing indicator to user: ' + error);
    } else if (response.body.error) {
      console.log('Error sending typing indicator to user: ' + response.body.error);
    }
  });
}


function getCityWeather(senderId, cityName) {
  let restUrl = WEATHER_BASE_URL + OPEN_WEATHER_TOKEN + '&q=' + cityName;
  request.get(restUrl, (err, response, body) => {
    if (!err && response.statusCode == 200) {
      let json = JSON.parse(body);
      console.log(json);
      let tempF = ~~(json.main.temp * 9 / 5 - 459.67);
      let tempC = ~~(json.main.temp - 273.15);
      let msg = 'The current condition in ' + json.name + ' is ' + json.weather[0].description + ' and the temperature is ' + tempF + ' ℉ (' + tempC + ' ℃).'
      sendMessageToUser(senderId, msg);
    } else {
      let errorMessage = 'Could not find any information on ' + cityName + ' .';
      sendMessageToUser(senderId, errorMessage);
    }
  })
}


app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});
