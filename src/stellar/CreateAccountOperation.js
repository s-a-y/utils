'use strict';

class CreateAccountOperation {
    constructor({destination, startingBalance}) {
        this.destination = destination;
        this.startingBalance = startingBalance;
    }
}

module.exports = CreateAccountOperation;
