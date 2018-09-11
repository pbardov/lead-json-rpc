const _ = require('underscore');
const exception = require('./error');

const DEFAULT_PREFIX = '';

const privateData = new WeakMap();
function pd(that) {
  return privateData.get(that);
}

class RpcServer {
  static translateError(err) {
    let code;
    let message;
    let data;
    if (err instanceof Error) {
      ({ message } = err);
      data = exception.RpcError.toPlainObject(err);
    } else {
      message = err.toString();
    }

    if (err instanceof exception.RpcError) {
      ({ code } = err);
    } else {
      code = -32001;
    }

    return {
      code,
      message,
      data
    };
  }

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
    let answer;
    try {
      try {
        body = _.isString(rawBody) ? JSON.parse(rawBody) : rawBody;
      } catch (err) {
        throw new exception.ParseError(err.message);
      }

      if (!body) {
        throw new exception.ParseError('empty request body');
      }

      if (_.isArray(body)) {
        const waits = _.map(body, r => this.serveSingleRequest(r));
        answer = await Promise.all(waits);
      } else {
        answer = await this.serveSingleRequest(body);
      }
    } catch (err) {
      answer = {
        jsonrpc: '2.0',
        id: null,
        result: undefined,
        error: RpcServer.translateError(err)
      };
    }

    return serializeResult ? JSON.stringify(answer) : answer;
  }

  async serveSingleRequest(body) {
    let result;
    let error;
    let id = null;
    try {
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

      id = body.id || null;

      const params = body.params || [];
      result = await this.invoke(body.method, params);
    } catch (err) {
      error = RpcServer.translateError(err);
    }

    const answer = {
      jsonrpc: '2.0',
      id,
      result,
      error
    };

    return answer;
  }
}

module.exports = RpcServer;
