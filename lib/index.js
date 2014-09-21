'use strict';

var _ = require('lodash'),
    mixins = require('ic-utils').mixins,
    AMQPHelper = require('./amqpHelper'),
    RPCHelper = require('./rpcHelper'),
    sharedConfig;

_.mixin(mixins);

exports.withConfig = function () {
  var args = _.arrgs(arguments);
  sharedConfig = args.length ? _.combine(args) : {};
  return this;
};

exports.initializeAmqp = _.partial(AMQPHelper.initialize, sharedConfig);
exports.initializeRpc = _.partial(RPCHelper.initialize, sharedConfig);
