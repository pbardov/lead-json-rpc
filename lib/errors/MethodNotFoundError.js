
const RpcError = require('./RpcError');
const defines = require('./defines');

class MethodNotFoundError extends RpcError {
    constructor(message)
    {
        super(message, defines.METHOD_NOT_FOUND);
        
        this.name = 'MethodNotFound';
    }
}

module.exports = MethodNotFoundError;
