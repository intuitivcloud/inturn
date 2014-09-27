'use strict';

var _ = require('lodash'),
    amqp = require('amqp'),
    async = require('async'),
    debug = require('debug')('amqp:amqpHelper'),
    putty = require('putty');

_.mixin(putty.mixins);

/**
 * The AMQPHelper class which provides mechanisms to publish, subscribe to
 * queues and exchanges.
 *
 * @param {Object} config the configuration used to connect to an AMQP server
 */
function AMQPHelper(config) {
  this._config = config;
  this._exchanges = {};
  this._queues = {};

  debug('Created AMQPHelper');
}

function verifyPresent(type, name) {
  /* jshint validthis: true */
  var names = this['_' + type + 's'];

  if (!(_.has(this[names], name)))
    throw new Error(_.fmt('No %s found with the name "%s" found', type, name));
}

/**
 * Subscribe to the queue with the specified name and have the specified handler be notified
 * when a message is recieved on it.
 *
 * @param  {String} qName   the name of the queue. This name must be specified at initialization time
 * @param  {[Object]} options vendor-specific options
 * @param  {Function} handler the callback to be used
 */
AMQPHelper.prototype.subscribe = function (qName, handler) {
  // will throw error if q is not found
  _.bind(verifyPresent, this)('queue', qName);

  this._queues[qName].subscribe(handler);
};

/**
 * Publish the specified message with the specified key to the queue
 * with the specified name
 *
 * @param  {String} exName  name of the exchange to publish the message to
 * @param  {String} key     the routing key to use to route the message through the right queue
 * @param  {Object} message the message to be published
 */
AMQPHelper.prototype.publish = function (exName, key, message) {
  // will throw error if q is not found
  _.bind(verifyPresent, this)('exchange', exName);

  this.exchanges[exName].publish(key, message);
};

function ensureQueue(exchange, qDef, callback) {
  /* jshint validthis: true */
  var amqpHelper = this,

      amqpConnection = amqpHelper._connection;

  qDef = _.pick(qDef, 'name', 'binding');

  // already created? noop
  if (~(amqpHelper._queues.indexOf(qDef.name))) {
    debug('Queue "%s" is already present', qDef.name);
    return callback();
  }

  // no name? - get out!
  if (_.isEmpty(qDef.name)) return callback(new Error('Cannot create anonymous queue'));

  // ask amqp to create or get a queue
  amqpConnection.queue(qDef.name, function (q) {
    if (qDef.binding)
      q.bind(exchange, qDef.binding);

    debug('Successfully setup queue "%s"', qDef.name);

    amqpHelper._queues[qDef.name] = exchange;

    callback();
  });
}

function ensureExchange(exDef, callback) {
  /* jshint validthis: true */
  var amqpHelper = this,
      amqpConnection = amqpHelper._connection;

  exDef = _(exDef)
    .pick('name', 'type', 'queues')
    .defaults({type: 'topic'})
    .value();

  // already created? noop
  if (~(amqpHelper._exchanges.indexOf(exDef.name))) {
    debug('Exchange %s already present', exDef.name);
    return callback();
  }

  // no name? - get out!
  if (_.isEmpty(exDef.name)) return callback(new Error('Cannot create anonymous exchange'));

  // ask amqp to create or get a exchange reference
  amqpConnection.exchange(exDef.name, { type: exDef.type }, function (exchange) {
    var queues = exDef.queues;

    // if no queues defined, get out
    if (!(queues.length)) {
      debug('Successfully setup exchange: ', exDef.name);
      amqpHelper._exchanges[exDef.name] = exchange;
      return callback();
    }

    queues = _.map(queues, function (qDef, qName) {
      qDef.name = qName;
      return qDef;
    });

    // parallelly setup all queues
    async.each(queues, _.bind(ensureQueue, amqpHelper, exchange), function (error) {
      if (error) {
        var exError = new Error(_.fmt('Unable to setup exchange "%s"!', exDef.name));
        exError.cause = error;

        debug('Error setting up queue: %s', error.queueName);

        return callback(exError);
      }

      debug('Successfully setup exchange "%s"', exDef.name);

      // store the name of the exchange
      amqpHelper._exchanges[exDef.name] = exchange;

      callback();
    });
  });
}


function createConnection(callback) {
  /* jshint validthis: true */
  var amqpHelper = this,
      config = _(amqpHelper._config)
        .pick('server', 'port', 'user', 'password', 'ssl', 'authMechanism')
        .defaults({
          server: 'localhost',
          port: 5672,
          user: 'guest',
          password: 'guest'
        }).value(),
        configToPass;

  debug('Inside create connection');

  configToPass = {
    host: config.server,
    port: config.port,
    login: config.user,
    password: config.password
  };

  if (config.ssl) configToPass.ssl = config.ssl;
  if (config.authMechanism) configToPass.authMechanism = config.authMechanism;

  amqpHelper._connection = amqp.createConnection(configToPass);

  debug('Connecting to AMQP');

  // called after connect + handshake
  amqpHelper._connection.on('ready', function () {
    debug('Connection to AMQP was successful');

    // setup a shutdown hook to disconnect from the AMQP server
    _.each(['exit', 'SIGINT', 'SIGTERM'], function (signal) {
      process.on(signal, function () {
        debug('Disconnecting from AMQP');
        amqpHelper._connection.disconnect();
      });
    });

    return callback();
  });

  amqpHelper._connection.on('error', function (error) {
    debug('Connection to AMQP failed:', error);
    return callback(error);
  });

}

exports.initialize = function () {
  var args = _.arrgs(arguments),
      callback = _.isFunction(_.last(args)) ? args.pop() : undefined,
      config = args.length ? _.combine(args) : {},
      amqpHelper = new AMQPHelper(config);

      config = _.pick(amqpHelper._config, 'exchanges');

  debug('Initializing AMQP');

  createConnection(function (error) {
    var exchanges = config.exchanges;

    if (error) return callback(error);

    // no exchanges to configure? get out!
    if (!(config.exchanges) || _.isEmpty) return callback();

    exchanges = _.map(exchanges, function (exDef, exName) {
      exDef.name = exName;
      return exDef;
    });

    // parallelly setup all exchanges
    async.each(exchanges, _.bind(ensureExchange, amqpHelper), function (error) {
      if (error) {
        debug('Error setting up exchange: %s', error.exchangeName);
        return callback(error);
      }

      // all exchanges setup successfully
      callback(null, amqpHelper);
    });

  });

  return this;
};
