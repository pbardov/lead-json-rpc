
const RpcError = require('./RpcError');
const defines = require('./defines');

class ParseError extends RpcError {
    constructor(message)
    {
        super(message, defines.PARSE_ERROR);
        
        this.name = 'ParseError';
    }
}

module.exports = ParseError;
