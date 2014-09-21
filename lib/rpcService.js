'use strict';

var _ = require('lodash'),
    debug = require('debug')('amqp:rpc:service');

function RpcService(rpc, namespace, localService) {
  _.extend(this, {
    _rpc: rpc,
    _namespace: namespace,
    _localService: localService
  });

  debug('Setting up service for "%s.*"', namespace);

  rpc.on(namespace + '.*', function (param, rpcCallback, callObject) {
    var methodName = callObject.cmd.split('.')[1],
        args;

    debug('Got methodName as:', methodName);

    if (!(_.has(localService, methodName) && _.isFunction(localService[methodName])))
      return rpcCallback(new Error('Unknown method "%s" on local service "%s"', methodName, namespace));

    args = param.params;

    debug('Got call arguments as:', args);

    args.push(function (err, result) {
      if (err)
        debug('Got error from local service:', err);
      else
        debug('Got result from local service as:', result);
      return rpcCallback(err, result);
    });

    try {
      debug('Attempting to invoke local service method "%s"', methodName);
      localService[methodName].apply(localService, args);
    } catch (e) {
      debug('Trapped error while invoking local service method "%s"', methodName);
      return rpcCallback(e);
    }
  });
}

exports.build = function (rpc, namespace, localService) {
  return new RpcService(rpc, namespace, localService);
};
