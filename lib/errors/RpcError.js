
const defines = require('./defines');

if (!('toObject' in Error.prototype))
    Object.defineProperty(Error.prototype, 'toObject', {
        value: function () {
            let alt = {};

            Object.getOwnPropertyNames(this).forEach(function (key) {
                alt[key] = this[key];
            }, this);

            return alt;
        },
        configurable: true,
        writable: true
    });

class RpcError extends Error {
    static factory(error)
    {
        const code = parseInt(error.code);
        let errClass;
        if (code === defines.PARSE_ERROR) {
            errClass = require('./ParseError');
        } else if (code === defines.INVALID_REQUEST) {
            errClass = require('./InvalidRequestError');
        } else if (code === defines.METHOD_NOT_FOUND) {
            errClass = require('./MethodNotFoundError');
        } else if (code === defines.INVALID_PARAMS) {
            errClass = require('./InvalidParamsError');
        } else if (code === defines.INTERNAL_ERROR) {
            errClass = require('./InternalError');
        } else {
            errClass = require('./ServerError');
        }

        const errObj = new errClass(error.message);

        const keys = Object.keys(errObj.toObject());
        const excludeKeys = {
            name: true,
            code: true
        };
        keys.forEach((v, k) => {
            if (!excludeKeys[k]) {
                if (error.data && error.data[k]) {
                    errObj[k] = error.data[k];
                } else {
                    if (errObj[k]) {
                        errObj[k] = undefined;
                    }
                }
            }
        });

        return errObj;
    }

    constructor(message, code)
    {
        if (!code) {
            code = defines.SERVER_ERROR;
        }
        code = parseInt(code);

        super(message);

        this.name = 'RpcError';
        this.code = code;
    }
}

module.exports = RpcError;
