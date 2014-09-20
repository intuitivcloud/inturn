'use strict';

var _ = require('lodash'),
    debug = require('debug')('amqp:rpc:client'),
    utils = require('../utils');

function RpcService(rpc, namespace, localService) {
  _.extend(this, {
    _rpc: rpc,
    _namespace: namespace,
    _localService: localService
  });
}

exports.build = function (rpc, namespace, localService) {
  return new RpcService(rpc, namespace, localService);
};
