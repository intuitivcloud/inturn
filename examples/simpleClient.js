'use strict';

var amqp = require('..');

amqp.withConfig({
  server: 'localhost',
  post: 5672,
  user: 'guest',
  password: 'guest'
}).initializeRpc(function (err, rpcHelper) {
  var helloClient = rpcHelper.buildClient('hello', 'sayHello', 'getQuote');

  helloClient.sayHello('John Doe', 'Maryland', function (err, result) {
    console.log(result);
  });

});
