'use strict';

require('dotenv').config();
const chai = require('chai');
const assert = chai.assert;

const logger = require('winston');

const kv = new (require('../src/KvStorage'))({
    logger,
    config: {env: 'development'},
});

const q = new (require('../src/KvQueue'))({
    kv,
    logger,
    config: {key: 'test-queue'},
});

describe.only('KvQueue tests', function () {
    this.timeout(3000);
    describe('KvQueue', () => {
        it('publish/consume', (done) => {
            const msg = `Test!!! ${Date.now()}`;
            q.publish({type: "test-type", object: msg})
                .then(() => {
                    return q.consume();
                })
                .then((tasks) => {
                    const task = tasks.pop();
                    assert(msg === task.object, 'Published and consumed message is the same');
                    done();
                })
                .catch(e => done(e));
        });
    });
});
