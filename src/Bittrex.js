'use strict';

const request = require('request-promise');
const publicUrl = 'https://bittrex.com/api/v1.1/public/';

class Bittrex {
    constructor({config, logger}) {
        this.config = config;
        this.logger = logger;
    }

    returnOrderBook(currencyPair) {
        return request({
            url: publicUrl + 'getorderbook',
            qs: {
                market: currencyPair ? currencyPair : 'BTC-XLM',
                type: 'both',
            },
            json: true
        }).catch((error) => {
            this.logger.error('ERROR: cannot retrieve orderbook', {error});
            throw error;
        });
    }

    getRate() {
        return this.returnOrderBook()
            .then(orderbook => {
                return ((parseFloat(orderbook.result.buy[0].Rate) + parseFloat(orderbook.result.sell[0].Rate)) / 2).toFixed(8)
            });
    }

}

module.exports = Bittrex;