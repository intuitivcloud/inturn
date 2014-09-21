'use strict';

var _ = require('lodash'),
    mixins = require('ic-utils').mixins,
    amqp = require('..');

_.mixin(mixins);

var helloService = {
  sayHello: function (name, location, callback) {
    callback(null, _.fmt('Hello %s, I am HelloService from %s', name, location));
  },

  getQuote: function (callback) {
    callback(null, 'The quick brown fox jumped over the lazy dog!');
  }
};

amqp.withConfig({
  server: 'localhost',
  port: 5672,
  user: 'guest',
  password: 'guest'
}).initializeRpc(function (err, rpcHelper) {
  rpcHelper.buildService('hello', helloService);
});
