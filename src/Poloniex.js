'use strict';

const request = require('request-promise');
const crypto = require('crypto');
const querystring = require('querystring');
const publicUrl = 'https://poloniex.com/public';
const nonce = require('nonce')();
const tradingApiUrl = 'https://poloniex.com/tradingApi';

class Poloniex {
    constructor({config, logger}) {
        this.config = config;
        this.logger = logger;
    }

    returnOrderBook(currencyPair, depth) {
        return request({
            url: publicUrl,
            qs: {
                depth: depth ? depth : 10,
                currencyPair: currencyPair ? currencyPair : 'BTC_STR',
                command: 'returnOrderBook',
            },
            json: true
        }).catch((error) => {
            this.logger.error('ERROR: cannot retrieve orderbook', {error});
            throw error;
        });
    }

    resolveRate(currencyPair = 'BTC_STR') {
        this.logger.info('Resolving Poloniex rate...');
        return this.returnOrderBook(currencyPair)
            .then((result) => {
                this.logger.debug('orderbook', { context: { orderbook: result }});
                const rate = ((parseFloat(result.asks[0][0]) + parseFloat(result.bids[0][0])) / 2).toFixed(8);
                this.logger.info(`...current Poloniex rate is '${rate}'.`);
                return rate;
            })
            .catch((error) => {
                this.logger.error('ERROR: Cannot resole Poloniex rate', {error});
                throw error;
            });
    }

    trade({currencyPair, rate, amount}, command) {
        const form = {
            currencyPair,
            rate,
            amount,
            command,
            nonce: nonce()
        };
        const formString = querystring.stringify(form);
        const Sign = crypto.createHmac('sha512', this.config.poloniexApiSecret).update(formString).digest('hex');

        return request({
            form,
            method: 'POST',
            url: tradingApiUrl,
            headers: {
                Sign,
                Key: this.config.poloniexApiKey,
            },
            json: true
        }).catch((error) => {
            this.logger.error('trade()', {error, context: {args: [{currencyPair, rate, amount}, command]}});
        throw error;
    });
    }

    sell({currencyPair, rate, amount}) {
        return this.trade({currencyPair, rate, amount}, 'sell');
    }

    buy({currencyPair, rate, amount}) {
        return this.trade({currencyPair, rate, amount}, 'buy');
    }

}

module.exports = Poloniex;
