'use strict';

class PaymentOperation {
    constructor({
                    destination,
                    assetType,
                    assetCode,
                    assetIssuer,
                    amount,
                }) {
        this.destination = destination;
        this.assetType = assetType;
        this.assetCode = assetCode;
        this.assetIssuer = assetIssuer;
        this.amount = amount;
    }
}

module.exports = PaymentOperation;
