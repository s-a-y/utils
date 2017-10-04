'use strict';

const async = require('async');

class KvQueue {
    constructor ({config, logger, kv}) {
        this.key = config.key;
        this.kv = kv;
        this.logger = logger;
    }
    publishTask ({type, object = null}) {
        return this.kv.lpush(this.key, {type, object});
    }

    popTasks (length = 10) {
        const tasksRead = [];
        const consumeTask = (callback) => {
            this.kv.rpop(this.key).then((value) => {
                tasksRead.unshift(value);
                callback(null, value)
            });
        };

        return new Promise((resolve, reject) => {
            async.parallelLimit(
                new Array(length).fill(consumeTask),
                3,
                (error, results) => {
                    if (error) {
                        this.logger.error('Queue: Failed to read tasks from queue. Unhandled tasks:', tasksRead);
                        reject(error);
                    } else {
                        results = results.filter(a => a);
                        this.logger.debug('New tasks received', results);
                        resolve(results.filter(a => a));
                    }
                }
            );
        });
    }
}

module.exports = KvQueue;
