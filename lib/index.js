'use strict';

var _ = require('lodash'),
    utils = require('../utils'),
    AMQPHelper = require('./amqpHelper'),
    RPCHelper = require('./rpcHelper'),
    sharedConfig;

exports.withConfig = function () {
  var args = utils.arrgs(arguments);
  sharedConfig = args.length ? utils.merge(args) : {};
  return this;
};

exports.initializeAmqp = _.partial(AMQPHelper.initialize, sharedConfig);
exports.initializeRpc = _.partial(RPCHelper.initialize, sharedConfig);
