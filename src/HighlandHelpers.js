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
                v.forEach((v) => {
                    push(null, v);
                });
                next();
            }
        })
    },
};
