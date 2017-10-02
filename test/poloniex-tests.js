'use strict';

require('dotenv').config();
const chai = require('chai');
const assert = chai.assert;

const Poloniex = require('../src/Poloniex');
const logger = require('winston');
const poloniex = new Poloniex({
        config: {
            poloniexApiSecret: process.env.POLONIEX_API_KEY ? process.env.POLONIEX_API_KEY : "3CDTZ2E6-C5QFQV26-GNT7JCO6-SNOO13UU",
        },
        logger,
    });

describe('poloniex tests', function () {
    this.timeout(3000);
    describe('rate resolver', () => {
        it('rate is available', (done) => {
            poloniex.resolveRate('BTC_STR')
                .then((rate) => {
                    assert(isCorrectRate(rate), 'Resolved rate has correct form');
                    done();
                })
                .catch(e => done(e));
        });
    });
});

function isCorrectRate(val) {
    const floatRegex = /^\d+(?:[.,]\d*?)?$/;
    if (!floatRegex.test(val))
        return false;

    val = parseFloat(val);
    return !isNaN(val);

}
