'use strict';

class PathPaymentOperation {
    constructor({
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
        this.destination = destination;
        this.source = source;
        this.path = path;
        this.sendAssetType = sendAssetType;
        this.sendAssetCode = sendAssetCode;
        this.sendAssetIssuer = sendAssetIssuer;
        this.destAssetType = destAssetType;
        this.destAssetCode = destAssetCode;
        this.destAssetIssuer = destAssetIssuer;
        this.destAmount = destAmount;
        this.sendMax = sendMax;
    }
}

module.exports = PathPaymentOperation;
