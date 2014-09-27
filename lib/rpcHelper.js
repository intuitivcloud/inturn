'use strict';

var _ = require('lodash'),
    debug = require('debug')('amqp:rpc:helper'),
    amqpRpc = require('amqp-rpc'),
    mixins = require('putty').mixins,
    RpcClient = require('./rpcClient'),
    RpcService = require('./rpcService');

_.mixin(mixins);

function buildRpcUrl(config) {
  config = _(config)
    .pick('server', 'port', 'user', 'password')
    .defaults({server: 'localhost', port: 5672, user: 'guest', password: 'guest'})
    .value();

  return _.fmt('amqp://%s:%s@%s:%d',
    config.user, config.password, config.server, config.port);
}

/**
 * The AMQPHelper class which provides mechanisms to publish, subscribe to
 * queues and exchanges.
 *
 * @param {Object} config the configuration used to connect to an AMQP server
 */
function RpcHelper(config) {
  _.extend(this, {
    _config: config,
    _clients: {},
    _servers: {},
    _rpc: amqpRpc.factory({url: buildRpcUrl(config)})
  });

  /**
  * Build an RPC client with the specified namespace and
  * specified remote method names
  *
  * @param {String} namespace the namespace of the remote service
  * @param {String|String...} remoteMethods the remote methods which the client can call
  *
  * @return {RpcClient} an instance of an RPC client which can talk to an RPC service
  */
  this.buildClient = _.partial(RpcClient.build, this._rpc);

  this.buildService = _.partial(RpcService.build, this._rpc);

  debug('Created RPC Helper');
}

exports.initialize = function (config, callback) {
  callback(null, new RpcHelper(config));
};
