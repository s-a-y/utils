'use strict';

const async = require('async');

class KvQueue {
    constructor ({config = {}, logger, kv}) {
        this.key = config.key;
        this.prefix = config.prefix || '';
        this.kv = kv;
        this.logger = logger;
    }

    queue(queue) {
        this.key = queue;
        return this;
    }

    publish (message) {
        if (!this.key) {
            throw new Error('queue undefined');
        }
        return this.kv.lpush(this.addPrefix(this.key), message);
    }

    consume (length = 10) {
        if (!this.key) {
            throw new Error('queue undefined');
        }
        return new Promise((resolve, reject) => {
            this.kv.client.multi(
                new Array(length).fill(['rpop', this.kv.addPrefix(this.addPrefix(this.key))])
            ).exec((error, results) => {
                if (error) {
                    reject(error);
                } else {
                    const tasks = results.filter(a => a).map(a => JSON.parse(a));
                    if (tasks.length) this.logger.debug('New tasks received', {tasks});
                    resolve(tasks);
                }
            });
        });
    }

    addPrefix (key) {
        return `${this.prefix}${key}`;
    }
}

module.exports = KvQueue;
