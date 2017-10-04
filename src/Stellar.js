'use strict';

const PaymentOperation = require('./stellar/PaymentOperation');
const ManageOfferOperation = require('./stellar/ManageOfferOperation');
const StellarSdk = require('stellar-sdk');

class Stellar {
    constructor ({config, logger}) {
        if (config.env === 'development') {
            StellarSdk.Network.useTestNetwork();
        } else {
            StellarSdk.Network.usePublicNetwork();
        }

        this.config = config;
        this.logger = logger;
        this.server = new StellarSdk.Server(config.horizonUrl);
        this.sdk = StellarSdk;
    }

    streamEffects ({account, cursorStorage, messageHandler, streamFromCursor, errorHandler = (error) => this.logger.error("ERROR: effects stream returns error", {error})}) {
        this.logger.info('Initializing effects streaming...');
        this.logger.info('Calling cursor storage..');
        return cursorStorage.get()
            .then((value) => {
                this.logger.info(`...stored cursor available: ${value}`);
                this.logger.info('Waiting for new message..');
                const close = this.server.effects()
                    .forAccount(account)
                    .cursor(streamFromCursor ? streamFromCursor : (value ? value : 'now'))
                    .stream({
                        onmessage: (message) => {
                            this.logger.info('..new message received');
                            this.logger.info('Processing new message...');
                            messageHandler({message, cursorStorage, close});
                            this.logger.info('...message processed');
                        },
                        onerror: (event) => {
                            this.logger.error('offers stream return error event', {
                                context: {
                                    event,
                                    account,
                                    cursor: value
                                }
                            });
                            errorHandler(new Error('Stellar effects stream returns error event'));
                        }
                    });
                return close;
            })
    }

    sendAssets (
        {
            account,
            accountSecret,
            destination,
            assetType,
            assetCode,
            assetIssuer,
            amount,
            memo,
            memoType,
        }
    ) {
        this.logger.info('sendAsset()', arguments);
        const operation = this.newPaymentOperation({assetType, assetCode, assetIssuer, destination, amount});

        return this.processTransaction({account, accountSecret, memo, memoType}, [operation]);

    }

    getOffersForAccount (accountId) {
        return this.server.offers('accounts', accountId).call()
            .then((result) => {
                return result.records.map((v) => {
                    return {
                        offerId: v.id,
                        account: v.seller,
                        sellingAssetType: v.selling.asset_type,
                        sellingAssetCode: v.selling.asset_code,
                        sellingAssetIssuer: v.selling.asset_issuer,
                        buyingAssetType: v.buying.asset_type,
                        buyingAssetCode: v.buying.asset_code,
                        buyingAssetIssuer: v.buying.asset_issuer,
                        amount: v.amount,
                        price: v.price
                    }
                });
            });
    }

    dropOffersForAccount({account, accountSecret}) {
        return this.getOffersForAccount(account)
            .then((offers) => {
                const operations = offers.map((v) => {
                    v.amount = 0;
                    return this.newManageOfferOperation(v);
                });

                return operations.length
                    ? this.processTransaction({account, accountSecret}, operations)
                    : Promise.resolve();
            });
    }

    manageOffers (args) {
        this.logger.debug('manageOffers', {context: {args: [args]}});
        return this.processTransaction(args, args.offers)
            .catch((error) => {
                this.logger.error('ERROR: manageOffers()', {error, context: {args}});
                throw error;
            });
    }

    processTransaction ({account, accountSecret, memo, memoType}, ops) {
        this.logger.debug('processTransaction()', {context: {args: [{account, accountSecret, memo, memoType}, ops]}});

        return this.server.loadAccount(account)
            .then(accountObject => {
                this.logger.debug('loadAccount', {context: {account: JSON.parse(JSON.stringify(accountObject))}});
                const builder = new StellarSdk.TransactionBuilder(accountObject);
                ops.forEach(operation => builder.addOperation(this.operationToStellarObject(operation)));

                if (memo) {
                    const memoObject = memoType === 'id' ? StellarSdk.Memo.id(memo) : StellarSdk.Memo.text(memo);
                    builder.addMemo(memoObject)
                }

                const transaction = builder.build();
                transaction.sign(StellarSdk.Keypair.fromSecret(accountSecret));

                return this.server.submitTransaction(transaction)
            })
            .catch((error) => {
                this.logger.error('processTransaction()', {error, context: { args: [{account, accountSecret, memo, memoType}, ops]}});
                throw error;
            });
    }

    newPaymentOperation ({destination, assetType, assetCode, assetIssuer, amount}) {
        return new PaymentOperation({destination, assetType, assetCode, assetIssuer, amount});
    }

    newManageOfferOperation (args) {
        return new ManageOfferOperation(args);
    }

    operationToStellarObject(operation) {
        switch (true) {
            case operation instanceof PaymentOperation:
                const asset = operation.assetType === 'native'
                    ? StellarSdk.Asset.native()
                    : new StellarSdk.Asset(operation.assetCode, operation.assetIssuer);
                return StellarSdk.Operation.payment({
                        asset,
                        destination: operation.destination,
                        amount: operation.amount.toString(),
                    });
            case operation instanceof ManageOfferOperation:
                return StellarSdk.Operation.manageOffer({
                    selling:
                        operation.sellingAssetType === 'native'
                            ? StellarSdk.Asset.native()
                            : new StellarSdk.Asset(operation.sellingAssetCode, operation.sellingAssetIssuer),
                    buying:
                        operation.buyingAssetType === 'native'
                            ? StellarSdk.Asset.native()
                            : new StellarSdk.Asset(operation.buyingAssetCode, operation.buyingAssetIssuer),
                    amount: operation.amount.toString(),
                    price: operation.price,
                    offerId: operation.offerId,
                });
            default:
                this.logger.error('Bad operation object', operation);
                return Promise.reject(new Error('Bad operation object'));
        }
    }
}

module.exports = Stellar;
