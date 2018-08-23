
const RpcError = require('./RpcError');
const defines = require('./defines');

class InternalError extends RpcError {
    constructor(message)
    {
        super(message, defines.INTERNAL_ERROR);
        
        this.name = 'InternalError';
    }
}

module.exports = InternalError;
