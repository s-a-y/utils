'use strict';

const request = require('request-promise');
const publicUrl = 'https://api.coinmarketcap.com/v1/ticker/';
const _ = require('lodash');

class CoinMarketCap {
    constructor({logger}) {
        this.logger = logger;
    }

    getRate(currencyPair = 'BTC_STR') {
        let [priceAsset, asset] = currencyPair.split(/[-_]/).map(_.upperCase);

        asset = asset === 'STR' ? 'XLM' : asset;
        const priceField = `price_${_.lowerCase(priceAsset)}`;

        return request({
            url: publicUrl,
            json: true
        })
            .then((result) => {
                return parseFloat(Object.values(result).filter(v => v.symbol === asset).shift()[priceField]);
            })
            .catch((error) => {
                this.logger.error('ERROR: Cannot resole CoinMarketCap rate', {error});
                throw error;
            });
    }
}

module.exports = CoinMarketCap;
