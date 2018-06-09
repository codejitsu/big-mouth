'use strict';

const co         = require('co');
const kinesis    = require('../lib/kinesis');
const streamName = process.env.order_events_stream;

const middy = require('middy');
const sampleLogging = require('../middleware/sample-logging');
const captureCorrelationIds = require('../middleware/capture-correlation-ids');

const handler = co.wrap(function* (event, context, cb) {
  let body = JSON.parse(event.body);
  let restaurantName = body.restaurantName;
  let orderId = body.orderId;
  let userEmail = body.userEmail;

  console.log(`restaurant [${restaurantName}] accepted order ID [${orderId}] from user [${userEmail}]`);

  let data = {
    orderId,
    userEmail,
    restaurantName,
    eventType: 'order_accepted'
  }

  let req = {
    Data: JSON.stringify(data), // the SDK would base64 encode this for us
    PartitionKey: orderId,
    StreamName: streamName
  };

  yield kinesis.putRecord(req).promise();

  console.log(`published 'order_accepted' event into Kinesis`);

  let response = {
    statusCode: 200,
    body: JSON.stringify({ orderId })
  }

  cb(null, response);
});

module.exports.handler = middy(handler)
  .use(captureCorrelationIds({ sampleDebugLogRate: 0.01 }))
  .use(sampleLogging({ sampleRate: 0.01 }));