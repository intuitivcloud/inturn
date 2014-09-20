'use strict';

var _ = require('lodash'),
    debug = require('debug')('amqp:rpc:client'),
    utils = require('../utils');

function RpcClient(rpc, namespace) {
  this._rpc = rpc;
  this._namespace = namespace;
}

function buildMethod(name) {
  /* jshint validthis: true */
  var client = this,
      namespace = client._namespace,
      remoteMethodName = utils.fmt('%s.%s', namespace, name),
      method;

  method = function () {
    var args = utils.arrgs(arguments),
        callback;

    if (_(args).last().isFunction())
      callback = args.pop();

    debug('Calling method "%s" with parameters %s',
        remoteMethodName, args);

    this._rpc.call(remoteMethodName, {
      params: args
    }, callback);
  };

  debug('Built method "%s" for client', remoteMethodName);

  client[name] = _.bind(method, client);
}

exports.build = function () {
  var args = utils.arrgs(arguments),
      rpc = args[0],
      namespace = args[1],
      remoteMethods = _.uniq(args.slice(2)),
      client = new RpcClient(rpc, namespace);

  // strap on remote methods onto the client
  _.each(remoteMethods, buildMethod, client);

  return client;
};
