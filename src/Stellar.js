'use strict';

const CreateAccountOperation = require('./stellar/CreateAccountOperation');
const PaymentOperation = require('./stellar/PaymentOperation');
const PathPaymentOperation = require('./stellar/PathPaymentOperation');
const AccountMergeOperation = require('./stellar/AccountMergeOperation');
const ManageOfferOperation = require('./stellar/ManageOfferOperation');
const CreatePassiveOfferOperation = require('./stellar/CreatePassiveOfferOperation');
const StellarSdk = require('stellar-sdk');
const XdrUtils = require('./stellar/XdrUtils');

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
        this.xdrUtils = new XdrUtils({logger});
    }

    streamTrades({account, cursorStorage, messageHandler, cursor, errorHandler = (error) => this.logger.error("ERROR: operations stream returns error", {error})}) {
        this.logger.info('Initializing trades streaming...');
        return this.streamResources(
            {
                builder: this.server.trades(),
            }, arguments[0]
        );
    }

    streamOperations({account, cursorStorage, messageHandler, cursor, errorHandler = (error) => this.logger.error("ERROR: operations stream returns error", {error})}) {
        this.logger.info('Initializing operations streaming...');
        return this.streamResources(
            {
                builder: this.server.operations(),
            }, arguments[0]
        );
    }

    streamEffects({account, cursorStorage, messageHandler, cursor, errorHandler = (error) => this.logger.error("ERROR: effects stream returns error", {error})}) {
        this.logger.info('Initializing effects streaming...');
        return this.streamResources(
            {
                builder: this.server.effects(),
            }, arguments[0]
        );
    }

    streamPayments({account, cursorStorage, messageHandler, cursor, errorHandler = (error) => this.logger.error("ERROR: effects stream returns error", {error})}) {
        this.logger.info('Initializing payments streaming...');
        return this.streamResources(
            {
                builder: this.server.payments(),
            }, arguments[0]
        );
    }

    streamTransactions({account, cursorStorage, messageHandler, cursor, errorHandler = (error) => this.logger.error("ERROR: effects stream returns error", {error})}) {
        this.logger.info('Initializing transactions streaming...');
        return this.streamResources(
            {
                builder: this.server.transactions(),
            }, arguments[0]
        );
    }

    streamResources (
      {builder},
      {
        account,
        cursorStorage,
        messageHandler = () => {},
        cursor,
        streamFromCursor, // for backward compatibility
        order = 'asc',
        limit = 200,
        errorHandler = (error) => this.logger.error("Stellar stream returns error", {error})
      }
    ) {
        cursor = cursor || streamFromCursor;
        this.logger.info('Calling cursor storage..');
        return (cursorStorage ? cursorStorage.get() : Promise.resolve(cursor))
            .then((cursor) => {
                this.logger.info(`...stored cursor available: ${cursor}`);
                this.logger.info('Waiting for new message..');
                builder.order(order);
                builder.limit(limit);
                if (account) {
                    builder.forAccount(account);
                }
                const close = builder
                    .cursor(cursor)
                    .stream({
                        onmessage: (message) => {
                            this.logger.info('..new message received');
                            messageHandler({message, cursorStorage, close});
                        },
                        onerror: (event) => {
                            this.logger.error('Stream returns error event', {
                                context: {
                                    cursor,
                                    event,
                                    account,
                                }
                            });
                            const error = new Error('Stellar stream returns error event');
                            error.event = event;
                            errorHandler(error);
                        }
                    });
                return close;
            })
    }

    generateKeyPair () {
        return this.sdk.Keypair.random();
    }

    createAccount (
        {
            account,
            accountSecret,
            destination,
            startingBalance,
            memo,
            memoType,
        }
    ) {
        this.logger.info('createAccount()', arguments[0]);
        const operation = this.newCreateAccountOperation({account, destination, startingBalance});

        return this.processTransaction({account, accountSecret, memo, memoType}, [operation]);

    }

    accountMerge (
        {
            account,
            accountSecret,
            destination,
            memo,
            memoType,
        }
    ) {
        this.logger.info('accountMerge()', arguments[0]);
        const operation = this.newAccountMergeOperation({account, destination});

        return this.processTransaction({account, accountSecret, memo, memoType}, [operation]);

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
        this.logger.info('sendAsset()', arguments[0]);
        const operation = this.newPaymentOperation({assetType, assetCode, assetIssuer, destination, amount});

        return this.processTransaction({account, accountSecret, memo, memoType}, [operation]);

    }

    pathPayment (
        {
            account,
            accountSecret,

            destination,
            source,
            path,
            sendAssetType,
            sendAssetCode,
            sendAssetIssuer,
            destAssetType,
            destAssetCode,
            destAssetIssuer,
            destAmount,
            sendMax,

            memo,
            memoType,
        }
    ) {
        this.logger.info('pathPayment()', arguments[0]);
        const operation = this.newPathPaymentOperation({
            destination,
            source,
            path,
            sendAssetType,
            sendAssetCode,
            sendAssetIssuer,
            destAssetType,
            destAssetCode,
            destAssetIssuer,
            destAmount,
            sendMax,
        });

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
        const offers = args.offers.map(v => this.newManageOfferOperation(v));
        return this.processTransaction(args, offers)
            .catch((error) => {
                this.logger.error('ERROR: manageOffers()', {error, context: {args}});
                throw error;
            });
    }

  createPassiveOffer (args) {
    this.logger.debug('createPassiveOffer', {context: {args: [args]}});
    const offers = args.offers.map(v => this.newCreatePassiveOfferOperation(v));
    return this.processTransaction(args, offers)
      .catch((error) => {
        this.logger.error('ERROR: createPassiveOffer()', {error, context: {args}});
        throw error;
      });
  }

    processTransaction ({account, accountSecret, memo, memoType, extraSecrets=[]}, ops) {
        this.logger.debug('processTransaction()', {context: {args: [{account, accountSecret, memo, memoType}, ops]}});

        if (accountSecret) extraSecrets.push(accountSecret);

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

                extraSecrets.forEach(secret => transaction.sign(StellarSdk.Keypair.fromSecret(secret)));

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


    newPathPaymentOperation ({
                        destination,
                        source,
                        path,
                        sendAssetType,
                        sendAssetCode,
                        sendAssetIssuer,
                        destAssetType,
                        destAssetCode,
                        destAssetIssuer,
                        destAmount,
                        sendMax,
                    }) {
        return new PathPaymentOperation({
            destination,
            source,
            path,
            sendAssetType,
            sendAssetCode,
            sendAssetIssuer,
            destAssetType,
            destAssetCode,
            destAssetIssuer,
            destAmount,
            sendMax,
        });
    }

    newManageOfferOperation (args) {
        return new ManageOfferOperation(args);
    }

    newCreatePassiveOfferOperation (args) {
        return new CreatePassiveOfferOperation(args);
    }

    newAccountMergeOperation (args) {
        return new AccountMergeOperation(args);
    }

    newCreateAccountOperation (args) {
        return new CreateAccountOperation(args);
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
            case operation instanceof PathPaymentOperation:
                const destAsset = operation.destAssetType === 'native'
                    ? StellarSdk.Asset.native()
                    : new StellarSdk.Asset(operation.destAssetCode, operation.destAssetIssuer);
                const sendAsset = operation.sendAssetType === 'native'
                    ? StellarSdk.Asset.native()
                    : new StellarSdk.Asset(operation.sendAssetCode, operation.sendAssetIssuer);
                return StellarSdk.Operation.pathPayment({
                    sendAsset,
                    path: operation.path,
                    sendMax: operation.sendMax,
                    destination: operation.destination,
                    destAmount: operation.destAmount.toString(),
                    destAsset: destAsset,
                });
            case operation instanceof ManageOfferOperation:
            case operation instanceof CreatePassiveOfferOperation:
                const args = {
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
                };
                return operation instanceof ManageOfferOperation
                  ? StellarSdk.Operation.manageOffer(args)
                  : StellarSdk.Operation.createPassiveOffer(args);
            case operation instanceof AccountMergeOperation:
                return StellarSdk.Operation.accountMerge({
                    destination: operation.destination,
                });
            case operation instanceof CreateAccountOperation:
                return StellarSdk.Operation.createAccount({
                    destination: operation.destination,
                    startingBalance: operation.startingBalance,
                });
            default:
                this.logger.error('Bad operation object', operation);
                return Promise.reject(new Error('Bad operation object'));
        }
    }
}

module.exports = Stellar;
