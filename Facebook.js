'use strict';

var ac = require('./ArogyaController.js');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const PAGE_ACCESS_TOKEN = 'EAAWLABO4Ro4BABYUy0rkAJxZA5JdEmwsyqUJ2Tu3q0Hk6wll7fYTlWq4l7eAuuSm8f3m8sLmZArBEc58hvdUt3n6KkG3F4nYnaQ77bsoAoZCL0Ir5ZC0qmBUJm9AItaDs1NSS2XOIr4vhbCr4PwBeZBSRTcuPo9N4KeAGZBxhYyQZDZD' ;
const VERIFY_TOKEN = 'AROGYA_CHATBOT' ;

let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);          
  }
});

// Message processing
app.post('/webhook', function (req, res) {
  var data = req.body;

  if (data.object === 'page') {
    
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    res.sendStatus(200);
  }
});

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  var messageId = message.mid;
  var messageText = message.text;

  if (messageText) {
    sendTextMessage(senderID, messageText); 
  } 
}

function sendTextMessage(recipientId, messageText) {
  var msg = ac.getQARank(messageText) ;
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: msg
    }
  };

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;
    } else {
      console.error("Unable to send message.");
    }
  });  
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});