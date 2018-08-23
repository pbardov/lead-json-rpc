
const defines = require('./defines');

class RpcError extends Error {
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
