'use strict';

const _ = require('lodash');
const BigNumber = require('bignumber.js');
const StellarSdk = require('stellar-sdk');

class XdrUtils {
    constructor ({logger}) {
        this.logger = logger;
    }

    decodePrice (price) {
        let n = new BigNumber(price.n());
        return n.div(new BigNumber(price.d())).toString();
    }

    decodeAccountId(account) {
        return StellarSdk.StrKey.encodeEd25519PublicKey(account.ed25519());
    }

    decodeAsset(asset) {
        const assetType = _.lowerFirst(asset.switch().name.substring(9));
        switch (assetType) {
            case 'native':
                return {
                    assetType,
                };
            case 'creditAlphanum4':
                return {
                    assetType,
                    assetCode: asset.alphaNum4().assetCode().toString().substring(0, 3),
                    issuer: this.decodeAccountId(asset.alphaNum4().issuer()),
                };
            case 'creditAlphanum12':
                return {
                    assetType,
                    assetCode: asset.alphaNum12().assetCode().toString().substring(0, 3),
                    issuer: this.decodeAccountId(asset.alphaNum12().issuer()),
                };
        }
    }

    decodeOfferEntry(offer) {
        const result = {};
        Object.keys(offer._attributes).forEach((key) => {
            let value;
            switch (key) {
                case 'sellerId':
                    value = this.decodeAccountId(offer.sellerId());
                    break;
                case 'offerId':
                    value = offer.offerId().toString();
                    break;
                case 'selling':
                    value = this.decodeAsset(offer.selling());
                    break;
                case 'buying':
                    value = this.decodeAsset(offer.buying());
                    break;
                case 'amount':
                    value = offer.amount().toString();
                    break;
                case 'price':
                    value = this.decodePrice(offer.price());
                    break;
            }
            result[key] = value;
        });
        return result;
    }

    decodeClaimOfferAtom (offer) {
        const result = {};
        Object.keys(offer._attributes).forEach((key) => {
            let value;
            switch (key) {
                case 'sellerId':
                    value = this.decodeAccountId(offer.sellerId());
                    break;
                case 'offerId':
                    value = offer.offerId().toString();
                    break;
                case 'assetSold':
                    value = this.decodeAsset(offer.assetSold());
                    break;
                case 'amountSold':
                    value = offer.amountSold().toString();
                    break;
                case 'assetBought':
                    value = this.decodeAsset(offer.assetBought());
                    break;
                case 'amountBought':
                    value = offer.amountBought().toString();
                    break;
            }
            result[key] = value;
        });
        return result;
    }

    decodeManageOfferResult(result) {
        return {
            success: {
                offersClaimed: result.success().offersClaimed().map((offer) => this.decodeClaimOfferAtom(offer)),
                offer: result.success().offer().switch().name !== 'manageOfferDeleted'
                    ? this.decodeOfferEntry(result.success().offer().offer())
                    : null,
            }
        };
    }

    decodeTransactionMeta(transactionMeta) {
        return {
            operations: transactionMeta.operations().map(o => this.decodeOperationMeta(o)),
        };
    }

    decodeOperationMeta (operation) {
        return {
            changes: operation.changes().map(c => this.decodeLedgerEntryChange(c)),
        };
    }

    decodeLedgerEntryChange(change) {
        switch (change.switch().name) {
            case 'ledgerEntryUpdated':
                return {
                    updated: this.decodeLedgerEntry(change.updated()),
                };
            case 'ledgerEntryState':
                return {
                    state: this.decodeLedgerEntry(change.state()),
                };
            case 'ledgerEntryCreated':
                return {
                    created: this.decodeLedgerEntry(change.created()),
                };
            case 'ledgerEntryRemoved':
                return {
                    removed: this.decodeLedgerEntryData(change.removed()),
                };
            default:
                this.logger.warn('Unknown switch name for change. Skip it', {switchName: change.switch().name});
                return null;

        }
    }

    decodeLedgerEntry(changeEntry) {
        return {
            lastModifiedLedgerSeq: changeEntry.lastModifiedLedgerSeq(),
            data: this.decodeLedgerEntryData(changeEntry.data()),
        };
    }

    decodeLedgerEntryData(entryData) {
        switch (entryData.switch().name) {
            case 'account':
                return {
                    account: this.decodeAccountEntry(entryData.account()),
                };
            case 'trustline':
                return {
                    trustLine: this.decodeTrustLineEntry(entryData.trustLine()),
                };
            case 'offer':
                return {
                    offer: this.decodeOfferEntry(entryData.offer()),
                };
            default:
                this.logger.warn('Unknown switch name for entryData. Skip it', {switchName: entryData.switch().name});
                const r = {};
                r[entryData.switch().name] = null;
                return r;
        }
    }

    decodeAccountEntry(account) {
        const result = {};
        Object.keys(account._attributes).forEach((key) => {
            let value;
            switch (key) {
                case 'accountId':
                    value = this.decodeAccountId(account.accountId());
                    break;
                case 'balance':
                    value = account.balance().toString();
                    break;
                case 'seqNum':
                    value = account.seqNum().toString();
                    break;
                case 'numSubEntries':
                    value = account.numSubEntries();
                    break;
                case 'inflationDest':
                    value = account.inflationDest();
                    break;
                case 'flags':
                    value = account.flags();
                    break;
                case 'homeDomain':
                    value = account.homeDomain();
                    break;
                case 'thresholds':
                    value = account.thresholds().toString('base64');
                    break;
                case 'signers':
                    value = account.signers();
                    break;
            }
            result[key] = value;
        });
        return result;
    }

    decodeTrustLineEntry(trustline) {
        const result = {};
        Object.keys(trustline._attributes).forEach((key) => {
            let value;
            switch (key) {
                case 'accountId':
                    value = this.decodeAccountId(trustline.accountId());
                    break;
                case 'asset':
                    value = this.decodeAsset(trustline.asset());
                    break;
                case 'balance':
                    value = trustline.balance().toString();
                    break;
                case 'limit':
                    value = trustline.limit().toString();
                    break;
                case 'flags':
                    value = trustline.flags();
                    break;
            }
            result[key] = value;
        });
        return result;
    }
}

module.exports = XdrUtils;