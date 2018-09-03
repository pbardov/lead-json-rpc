
const RpcError = require('./RpcError');
const defines = require('./defines');

class InvalidRequestError extends RpcError {
  constructor(message) {
    super(message, defines.INVALID_REQUEST);

    this.name = 'InvalidRequest';
  }
}

module.exports = InvalidRequestError;
