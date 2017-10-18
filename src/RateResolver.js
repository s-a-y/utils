'use strict';

let pair = 'BTC_STR';

class RateResolver {
    constructor({config, exchange, logger}) {
        this.active = false;
        this.currentRate = null;
        this.interval = config.interval;
        this.triggerBoundaryPcs = config.triggerBoundaryPcs;
        this.exchange = exchange;
        this.logger = logger;
    }

    onUpdate(cb) {
        this.onUpdateCallback = cb;
        return this;
    }

    run () {
        if (this.active) {
            setTimeout(() => this.mainLoop(), this.interval);
        }
    }

    start () {
        this.active = true;
        this.run();
        return this;
    }

    stop () {
        this.active = false;
        return this;
    }

    mainLoop () {
        return this.exchange.getRate(pair)
            .then((rate) => {
                this.logger.debug('rate ' + rate);
                if (this.isReadyForUpdate(rate)) {
                    this.logger.info(`Rate changes by more than ${this.triggerBoundaryPcs}%. Initiating offers update.`);
                    if (this.onUpdateCallback) {
                        return this.onUpdateCallback({rate, pair});
                    }
                }
            })
            .then(
                () => this.run(),
                (error) => {
                    this.logger.error('Unexpected error caught', {error});
                    this.run();
                }
            )
    }

    isReadyForUpdate (rate) {
        const delta = Math.abs(this.currentRate - rate);
        this.logger.info('Delta: ', delta.toFixed(8));

        this.currentRate = rate;

        return (delta > 0 && delta * 100 / rate > parseFloat(this.triggerBoundaryPcs));
    }
}

module.exports = RateResolver;
