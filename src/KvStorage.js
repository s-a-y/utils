'use strict';
const bluebird = require('bluebird');
const redis = require('redis');

bluebird.promisifyAll(redis.RedisClient.prototype);

class KvStorage {
    constructor ({config, logger}) {
        this.client = redis.createClient();
        this.logger = logger;
        this.prefix = config.env + ':';
        this.client.on('error', function (error) {
            this.logger.error('KvStorage', error);
        });
    }

    static getInstance ({config}) {
        return new KvStorage({config});
    }

    hget (key, field, defaultValue = null) {
        return this.client.hgetAsync(this.addPrefix(key), field)
            .then(value => {
                if (value === 'undefined' || !value) {
                    return defaultValue;
                } else {
                    return JSON.parse(value);
                }
            });
    }

    hset (key, field, value) {
        return this.client.hsetAsync(this.addPrefix(key), field, JSON.stringify(value));
    }

    get (key, defaultValue = null) {
        return this.client.getAsync(this.addPrefix(key))
            .then(value => {
                if (value === 'undefined' || !value) {
                    return defaultValue;
                } else {
                    return JSON.parse(value);
                }
            });
    }

    set (key, value) {
        return this.client.setAsync(this.addPrefix(key), JSON.stringify(value));
    }

    sadd (key, value) {
        return this.client.saddAsync(this.addPrefix(key), value);
    }

    lpush(key, value) {
        return this.client.lpushAsync(this.addPrefix(key), JSON.stringify(value));
    }

    rpop(key, defaultValue = null) {
        return this.client.rpopAsync(this.addPrefix(key))
            .then((value) => {
                if (value === 'undefined' || !value) {
                    return defaultValue;
                } else {
                    return JSON.parse(value);
                }
            });
    }

    addPrefix (key) {
        return `${this.prefix}${key}`;
    }
}

module.exports = KvStorage;
