'use strict';
const bluebird = require('bluebird');
const redis = require('redis');

bluebird.promisifyAll(redis.RedisClient.prototype);

const MODE_ASYNC = 'async';
const MODE_SYNC = 'sync';

class KvStorage {
    constructor ({config, logger}) {
        this.client = redis.createClient();
        this.logger = logger;
        this.mode = config.mode || MODE_ASYNC;
        this.prefix = config.env + ':';
        this.client.on('error', function (error) {
            this.logger.error('KvStorage', error);
        });
    }

    static getInstance ({config}) {
        return new KvStorage({config});
    }

    decodeValue (value, defaultValue) {
        if (value === 'undefined' || !value) {
            return defaultValue;
        } else {
            return JSON.parse(value);
        }
    }

    hget (key, field, defaultValue = null) {
        if (this.mode === MODE_ASYNC) {
            return this.client.hgetAsync(this.addPrefix(key), field)
                .then(value => {
                    this.decodeValue(value, defaultValue);
                });
        } else {
            return this.decodeValue(this.client.hget(this.addPrefix(key), field), defaultValue);
        }
    }

    hset (key, field, value) {
        return this.mode === MODE_ASYNC
            ? this.client.hsetAsync(this.addPrefix(key), field, JSON.stringify(value))
            : this.client.hset(this.addPrefix(key), field, JSON.stringify(value));
    }

    get (key, defaultValue = null) {
        if (this.mode === MODE_ASYNC) {
            return this.client.getAsync(this.addPrefix(key))
                .then(value => {
                    this.decodeValue(value, defaultValue);
                });
        } else {
            return this.decodeValue(this.client.get(this.addPrefix(key)), defaultValue);
        }
    }

    set (key, value) {
        return this.mode === MODE_ASYNC
            ? this.client.setAsync(this.addPrefix(key), JSON.stringify(value))
            : this.client.set(this.addPrefix(key), JSON.stringify(value));
    }

    sadd (key, value) {
        return this.mode === MODE_ASYNC
            ? this.client.saddAsync(this.addPrefix(key), value)
            : this.client.sadd(this.addPrefix(key), value);
    }

    lpush(key, value) {
        return this.mode === MODE_ASYNC
            ? this.client.lpushAsync(this.addPrefix(key), JSON.stringify(value))
            : this.client.lpush(this.addPrefix(key), JSON.stringify(value));
    }

    rpop(key, defaultValue = null) {
        if (this.mode === MODE_ASYNC) {
            return this.client.rpopAsync(this.addPrefix(key))
                .then(value => {
                    this.decodeValue(value, defaultValue);
                });
        } else {
            return this.decodeValue(this.client.rpop(this.addPrefix(key)), defaultValue);
        }
    }

    keys (pattern) {
        if (this.mode === MODE_ASYNC) {
            return this.client.keysAsync(this.addPrefix(pattern));
        } else {
            return this.client.keys(this.addPrefix(pattern));
        }
    }

    addPrefix (key) {
        return `${this.prefix}${key}`;
    }
}

module.exports = KvStorage;
