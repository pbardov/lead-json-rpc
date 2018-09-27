const _ = require('underscore');

const isBrowser = new Function('try {return this===window;}catch(e){ return false;}'); // eslint-disable-line no-new-func
const crypto = isBrowser() ? require('crypto-browserify') : require('crypto');
const BatchRpcRequest = require('./BatchRpcRequest');
const { RpcError } = require('./error');

const RPC_DEFAULT_TIMEOUT = 5000;

const privateData = new WeakMap();
function pd(that) {
  return privateData.get(that);
}

class RpcClient {
  static generateId() {
    const now = new Date();
    const rnd = Math.floor(Math.random() * 1000);
    const id = `${now.getTime()}${rnd}`;
    return id;
  }

  constructor(transport, { key, secret } = {}) {
    const onAnswer = function onTransportAnswer(answer) {
      const { waiting } = pd(this);
      const arr = _.isArray(answer) ? answer : [answer];
      _.each(arr, (ans) => {
        const { id = null } = ans;
        if (_.has(waiting, id)) {
          waiting[id](ans);
        }
      });
    }.bind(this);

    const doRequest = function doRequest(methodName, ...args) {
      let request;
      const result = new Promise((resolve, reject) => {
        request = this.createRequest(methodName, ...args);

        const tid = setTimeout(() => {
          delete pd(this).waiting[request.id];
          reject(new Error('Timed out'));
        }, pd(this).timeout);

        pd(this).waiting[request.id] = (answer) => {
          clearTimeout(tid);
          delete pd(this).waiting[request.id];
          if (answer.error) {
            const error = RpcError.factory(answer.error);
            reject(error);
          } else {
            resolve(answer.result);
          }
        };
      });

      return { result, request };
    }.bind(this);

    privateData.set(this, {
      timeout: RPC_DEFAULT_TIMEOUT,
      waiting: {},
      transport,
      onAnswer,
      key,
      secret,
      batch: null,
      doRequest
    });

    this.transport = transport;
    this.commitBatch = this.commitBatch.bind(this);
  }

  get timeout() {
    return pd(this).timeout;
  }

  set timeout(t) {
    pd(this).timeout = parseInt(t, 10);
  }

  get transport() {
    return pd(this).transport;
  }

  set transport(transport) {
    pd(this).transport = transport;
    pd(this).transport.on('jsonRpcAnswer', pd(this).onAnswer);
  }

  set auth({ key, secret }) {
    pd(this).key = key;
    pd(this).secret = secret;
  }

  createBatch(autocommitDelay = 100) {
    const { doRequest } = pd(this);
    const batchRequest = new BatchRpcRequest({
      invoke: doRequest,
      commit: (batch) => {
        const { transport } = pd(this);
        transport.serveRequest(batch);
      },
      autocommitDelay
    });
    return batchRequest;
  }

  beginBatch(autocommitDelay = 100) {
    const { batch } = pd(this);
    if (!batch) {
      pd(this).batch = this.createBatch(autocommitDelay);
    }
  }

  commitBatch(keepBatch = true) {
    const { batch } = pd(this);
    batch.end();
    if (!keepBatch) {
      pd(this).batch = null;
    }
  }

  endBatch() {
    this.commitBatch(false);
  }

  invoke(methodName, ...args) {
    const { batch, doRequest, transport } = pd(this);
    if (batch) {
      return batch.invoke(methodName, ...args);
    }
    const { result, request } = doRequest(methodName, ...args);
    transport.serveRequest(request);
    return result;
  }

  createRequest(methodName, ...args) {
    const request = _.extend(
      {
        jsonrpc: '2.0',
        method: methodName,
        params: args,
        id: RpcClient.generateId()
      },
      this.createSignature(methodName, args)
    );
    return request;
  }

  createSignature(method, params) {
    const { key, secret } = pd(this);

    if (!key) {
      return {};
    }

    const now = new Date();
    const timestamp = now.getTime();

    const signData = {
      key,
      secret,
      timestamp,
      method,
      params
    };
    const signature = crypto
      .createHash('sha1')
      .update(JSON.stringify(signData))
      .digest('base64');

    return { key, signature, timestamp };
  }
}

module.exports = RpcClient;
