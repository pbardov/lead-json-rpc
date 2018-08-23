
const RpcError = require('./RpcError');
const defines = require('./defines');

class ServerError extends RpcError {
    constructor(message)
    {
        super(message, defines.SERVER_ERROR);

        this.name = 'ServerError';
    }
}

module.exports = ServerError;
