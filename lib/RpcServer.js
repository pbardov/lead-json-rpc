
const _ = require('underscore');
const exception = require('./error');

const DEFAULT_PREFIX = '';

class RpcServer {
    constructor()
    {
        this._registrations = {};
    }

    hasMethod(name)
    {
        return this._registrations.hasOwnProperty(name);
    }

    regMethod(name, func)
    {
        this._registrations[name] = func;
    }

    regObject(obj, options)
    {
        if (!options) {
            options = {};
        }

        const prefix = options.prefix || DEFAULT_PREFIX;
        const namespace = options.namespace || '';

        const objClass = obj.constructor.prototype;
        const ownNames = Object.getOwnPropertyNames(obj);
        const clNames = Object.getOwnPropertyNames(objClass);
        const names = ownNames.concat(clNames);

        for (let n = 0; n < names.length; ++n) {
            const k = names[n];
            if (k.indexOf(prefix) !== 0 || (typeof obj[k] !== 'function')) {
                continue;
            }
            const name = (namespace ? `${namespace}.` : '') + k.substr(prefix.length);
            const func = obj[k].bind(obj);
            this.regMethod(name, func);
        }
    }

    async invoke(methodName, args)
    {
        if (!this._registrations.hasOwnProperty(methodName)) {
            throw new exception.MethodNotFoundError;
        }

        try {
            const result = await this._registrations[methodName].apply(null, args);
            return result;
        } catch (err) {
            throw exception.RpcError.factory(err);
        }
    }

    async serveRequest(rawBody, serializeResult = true)
    {
        let body, result, error;
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
                throw new exception.InvalidParamsError('Named params not supported, only positioning params');
            }

            if (!body.id) {
                throw new exception.InvalidRequestError('id must not be empty');
            }

            const params = body.params || [];
            result = await this.invoke(body.method, params);
        } catch (err) {
            let errCode, errMessage, errData;
            if (err instanceof Error) {
                errMessage = err.message;
                errData = err.toObject();
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
            result: result,
            error: error,
            id: body.id
        };

        return serializeResult ? JSON.stringify(answer) : answer;
    }
}

module.exports = RpcServer;
