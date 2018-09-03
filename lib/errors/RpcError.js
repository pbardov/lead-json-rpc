/* eslint-disable global-require */
const defines = require('./defines');

class RpcError extends Error {
  static toPlainObject(err) {
    const alt = {};

    Object.getOwnPropertyNames(err).forEach(function walkProps(key) {
      alt[key] = this[key];
    }, err);

    return alt;
  }

  static factory(error) {
    let errData;
    if (error instanceof Error) {
      errData = {
        code: error.code || defines.SERVER_ERROR,
        message: error.message,
        data: RpcError.toPlainObject(error)
      };
    } else {
      errData = error;
    }
    const code = parseInt(errData.code, 10);
    let ErrClass;
    if (code === defines.PARSE_ERROR) {
      ErrClass = require('./ParseError');
    } else if (code === defines.INVALID_REQUEST) {
      ErrClass = require('./InvalidRequestError');
    } else if (code === defines.METHOD_NOT_FOUND) {
      ErrClass = require('./MethodNotFoundError');
    } else if (code === defines.INVALID_PARAMS) {
      ErrClass = require('./InvalidParamsError');
    } else if (code === defines.INTERNAL_ERROR) {
      ErrClass = require('./InternalError');
    } else {
      ErrClass = require('./ServerError');
    }

    const errObj = new ErrClass(errData.message);

    const keys = Object.keys(RpcError.toPlainObject(errObj));
    const excludeKeys = {
      name: true,
      code: true,
      message: true
    };
    keys.forEach((k) => {
      if (!excludeKeys[k]) {
        if (errData.data && errData.data[k]) {
          errObj[k] = errData.data[k];
        } else if (errObj[k]) {
          errObj[k] = undefined;
        }
      }
    });

    return errObj;
  }

  constructor(message, code = defines.SERVER_ERROR) {
    const intCode = parseInt(code, 10);

    super(message);

    this.name = 'RpcError';
    this.code = intCode;
  }
}

module.exports = RpcError;
