'use strict';

class ManageOfferOperation {
    constructor({
                    sellingAssetType,
                    sellingAssetCode,
                    sellingAssetIssuer,
                    buyingAssetType,
                    buyingAssetCode,
                    buyingAssetIssuer,
                    amount,
                }) {
        this.sellingAssetType = sellingAssetType;
        this.sellingAssetCode = sellingAssetCode;
        this.sellingAssetIssuer = sellingAssetIssuer;
        this.buyingAssetType = buyingAssetType;
        this.buyingAssetCode = buyingAssetCode;
        this.buyingAssetIssuer = buyingAssetIssuer;
        this.amount = amount;
    }
}

module.exports = ManageOfferOperation;
