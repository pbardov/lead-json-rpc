const _ = require('underscore');
const exception = require('./error');

const DEFAULT_PREFIX = '';

const privateData = new WeakMap();
function pd(that) {
  return privateData.get(that);
}

class RpcServer {
  constructor() {
    privateData.set(this, {
      registrations: {}
    });
  }

  hasMethod(name) {
    return Object.prototype.hasOwnProperty.call(pd(this).registrations, name);
  }

  regMethod(name, func) {
    pd(this).registrations[name] = func;
  }

  regObject(obj, options = {}) {
    const prefix = options.prefix || DEFAULT_PREFIX;
    const namespace = options.namespace || '';

    const objClass = obj.constructor.prototype;
    const ownNames = Object.getOwnPropertyNames(obj);
    const clNames = Object.getOwnPropertyNames(objClass);
    const names = ownNames.concat(clNames);

    for (let n = 0; n < names.length; n += 1) {
      const k = names[n];
      if (k.indexOf(prefix) === 0 && typeof obj[k] === 'function') {
        const name = (namespace ? `${namespace}.` : '') + k.substr(prefix.length);
        const func = obj[k].bind(obj);
        this.regMethod(name, func);
      }
    }
  }

  async invoke(methodName, args) {
    if (!pd(this).registrations[methodName]) {
      throw new exception.MethodNotFoundError();
    }

    try {
      const result = await pd(this).registrations[methodName].apply(null, args);
      return result;
    } catch (err) {
      throw exception.RpcError.factory(err);
    }
  }

  async serveRequest(rawBody, serializeResult = true) {
    let body;
    let result;
    let error;
    try {
      try {
        body = _.isString(rawBody) ? JSON.parse(rawBody) : rawBody;
      } catch (err) {
        throw new exception.ParseError(err.message);
      }

      if (!body) {
        throw new exception.ParseError('empty request body');
      }

      if (!body.jsonrpc || body.jsonrpc !== '2.0') {
        throw new exception.InvalidRequestError('jsonrpc must be exactly 2.0');
      }

      if (!body.method || !_.isString(body.method)) {
        throw new exception.InvalidRequestError('method must not be empty');
      }

      if (body.params && !_.isArray(body.params)) {
        throw new exception.InvalidParamsError(
          'Named params not supported, only positioning params'
        );
      }

      if (!body.id) {
        throw new exception.InvalidRequestError('id must not be empty');
      }

      const params = body.params || [];
      result = await this.invoke(body.method, params);
    } catch (err) {
      let errCode;
      let errMessage;
      let errData;
      if (err instanceof Error) {
        errMessage = err.message;
        errData = exception.RpcError.toPlainObject(err);
      } else {
        errMessage = err.toString();
      }

      if (err instanceof exception.RpcError) {
        errCode = err.code;
      } else {
        errCode = -32001;
      }

      error = {
        code: errCode,
        message: errMessage,
        data: errData
      };
    }

    const answer = {
      jsonrpc: '2.0',
      id: body.id,
      result,
      error
    };

    return serializeResult ? JSON.stringify(answer) : answer;
  }
}

module.exports = RpcServer;
