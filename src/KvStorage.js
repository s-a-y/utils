'use strict';
const MODE_ASYNC = 'async';
const MODE_SYNC = 'sync';

class KvStorage {
    constructor ({config, logger, client}) {
        this.config = config;
        this.client = client;
        this.logger = logger;
        this.mode = config.mode || MODE_ASYNC;
        this.prefix = config.env + ':';
        this.client.on('error', function (error) {
            this.logger.error('KvStorage', error);
        });
    }

    duplicate (opts) {
        const config = Object.assign(this.config, opts);

        return new KvStorage({
            config,
            logger: this.logger,
            client: this.client.duplicate(),
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
                    return this.decodeValue(value, defaultValue);
                });
        } else {
            return this.decodeValue(this.client.hget(this.addPrefix(key), field), defaultValue);
        }
    }

    hset (key, field, value) {
        const method = this.mode === MODE_ASYNC ? 'hsetAsync' : 'hset';
        return this.client[method](this.addPrefix(key), field, JSON.stringify(value));
    }

    get (key, defaultValue = null) {
        if (this.mode === MODE_ASYNC) {
            return this.client.getAsync(this.addPrefix(key))
                .then(value => {
                    return this.decodeValue(value, defaultValue);
                });
        } else {
            return this.decodeValue(this.client.get(this.addPrefix(key)), defaultValue);
        }
    }

    set (key, value) {
        const method = this.mode === MODE_ASYNC ? 'setAsync' : 'set';
        return this.client[method](this.addPrefix(key), JSON.stringify(value));
    }

    sadd (key, value) {
        const method = this.mode === MODE_ASYNC ? 'saddAsync' : 'sadd';
        return this.client[method](this.addPrefix(key), value);
    }

    lpush(key, value) {
        const method = this.mode === MODE_ASYNC ? 'lpushAsync' : 'lpush';
        return this.client[method](this.addPrefix(key), JSON.stringify(value))
    }

    rpop(key, defaultValue = null) {
        if (this.mode === MODE_ASYNC) {
            return this.client.rpopAsync(this.addPrefix(key))
                .then(value => {
                    return this.decodeValue(value, defaultValue);
                });
        } else {
            return this.decodeValue(this.client.rpop(this.addPrefix(key)), defaultValue);
        }
    }

    keys (pattern) {
        const method = this.mode === MODE_ASYNC ? 'keysAsync' : 'keys';
        return this.client[method](this.addPrefix(pattern));
    }

    subscribe (topic) {
        const method = this.mode === MODE_ASYNC ? 'subscribeAsync' : 'subscribe';
        return this.client[method](this.addPrefix(topic));
    }

    publish (topic, message) {
        const method = this.mode === MODE_ASYNC ? 'publishAsync' : 'publish';
        return this.client[method](this.addPrefix(topic), JSON.stringify(message));
    }

    on (type, callback) {
        const method = this.mode === MODE_ASYNC ? 'onAsync' : 'on';
        return this.client[method](
            type,
            (topic, message) => callback(this.removePrefix(topic), this.decodeValue(message))
        );
    }

    addPrefix (key) {
        return `${this.prefix}${key}`;
    }

    removePrefix (key) {
        return key.substr(this.prefix.length);
    }
}

module.exports = KvStorage;
