'use strict';

require('dotenv').config();
const chai = require('chai');
const assert = chai.assert;

const Stellar = require('../src/Stellar');
const winston = require('winston');
const logger = new winston.Logger({
    level: 'debug',
    transports: [
        new (winston.transports.Console)(),
    ]
});
const stellar = new Stellar({
        logger,
        config: {
            env: 'development',
            horizonUrl: 'https://horizon-testnet.stellar.org',
        },
    });

const issuerAccount = 'GAVZL57ACLQBQJHECJ47TT7LDUXFDAB3JPW6ZW4ALK36VXSQGWJEOMTA';
const issuerAccountSecret = 'SAB6WH6F2VKK3EI4VOAQ2XCLZU2PAJPIXZB6QM4RYDN5BB4FMT3NWFGR';
const assetType = '';
const assetCode = 'BTC';
const assetIssuer = 'GAVZL57ACLQBQJHECJ47TT7LDUXFDAB3JPW6ZW4ALK36VXSQGWJEOMTA';

const account1 = 'GD3XC3CVBSZPPUXDLNLU5RHTAIDSYZGQ3P6ETKRECJUGEX6GYHHL4CZU';
const accountSecret1 = 'SCYCSBP4GG2XD2SGW4XX6PES5UKLU7Y2NRZWQ3DXN4UNI72UV6HLTMNQ';

const account2 = 'GCSAZHEZGFRGJBPVCOAPXJ2QVBGDNG6T5OYYQZEJLCJUWQDABEUXEW7R';
const accountSecret2 = 'SBIGDZQGCT5ALJJXSO5YDY5WCTJYP5MCZAS7KIILYWF6H7AYAJ5O7VVX';

describe('stellar tests', function () {
    this.timeout(20000);
    describe('send assets', () => {
        it('send assets', (done) => {
            let initialBalance = 0;
            let finalBalance = 0;
            const amount = 0.1;
            stellar.server.loadAccount(account2)
                .then((accountObject2) => {
                    initialBalance = accountObject2.balances.filter(v => v.asset_code === 'BTC').pop().balance;
                    return stellar.sendAssets({
                        amount,
                        account: account1,
                        accountSecret: accountSecret1,
                        destination: account2,
                        assetType: '',
                        assetCode: 'BTC',
                        assetIssuer: issuerAccount,
                        memo: 'Test',
                        memoType: 'text',
                    })
                })
                .then(() => {
                    return stellar.server.loadAccount(account2)
                })
                .then((accountObject2) => {
                    finalBalance = accountObject2.balances.filter(v => v.asset_code === 'BTC').pop().balance;
                    assert((parseFloat(finalBalance) - parseFloat(initialBalance)).toFixed(7) === amount.toFixed(7), `initialBalance - finalBalance == ${amount}`);
                    done();
                })
                .catch(e => done(e));
        });
    });
});
