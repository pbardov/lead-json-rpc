const RpcError = require('./RpcError');
const defines = require('./defines');

class InvalidParamsError extends RpcError {
  constructor(message) {
    super(message, defines.INVALID_PARAMS);

    this.name = 'InvalidParams';
  }
}

module.exports = InvalidParamsError;
