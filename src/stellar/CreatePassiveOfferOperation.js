'use strict';

class CreatePassiveOfferOperation {
    constructor({
                    sellingAssetType,
                    sellingAssetCode,
                    sellingAssetIssuer,
                    buyingAssetType,
                    buyingAssetCode,
                    buyingAssetIssuer,
                    amount,
                    price,
                    offerId,
                  }) {
        this.sellingAssetType = sellingAssetType;
        this.sellingAssetCode = sellingAssetCode;
        this.sellingAssetIssuer = sellingAssetIssuer;
        this.buyingAssetType = buyingAssetType;
        this.buyingAssetCode = buyingAssetCode;
        this.buyingAssetIssuer = buyingAssetIssuer;
        this.amount = amount;
        this.price = price;
        this.offerId = offerId;
    }
}

module.exports = CreatePassiveOfferOperation;
