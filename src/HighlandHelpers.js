const _ = require('highland');

module.exports = {
    mapAsync: _.curry(function (mapper, source) {
        return source.consume((err, v, push, next) => {
            if (err) {
                push(err);
                next();
            }
            else if (v === _.nil) {
                push(null, v);
            }
            else {
                mapper(v)
                    .then((v) => {
                        push(null, v);
                        next();
                    });
            }
        })
    }),
    splitArray: function (source) {
        return source.consume((err, v, push, next) => {
            if (err) {
                push(err);
                next();
            }
            else if (v === _.nil) {
                push(null, v);
            }
            else {
                if (Array.isArray(v)) {
                    v.forEach((item) => {
                        push(null, item);
                    });
                } else {
                    push(null, v);
                }
                next();
            }
        })
    },

    dotoAsync: _.curry(function (f, source) {
        return source.consume((err, v, push, next) => {
            if (err) {
                push(err);
                next();
            }
            else if (v === _.nil) {
                push(null, v);
            }
            else {
                f(v)
                    .then(() => {
                        push(null, v);
                        next();
                    });
            }
        })
    }),
    filterAsync: _.curry(function (f, source) {
        return source.consume((err, v, push, next) => {
            if (err) {
                push(err);
                next();
            }
            else if (v === _.nil) {
                push(null, v);
            }
            else {
                f(v)
                    .then((result) => {
                        if (result) {
                            push(null, v);
                        }
                        next();
                    });
            }
        })
    }),
};
