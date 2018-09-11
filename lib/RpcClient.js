const _ = require('underscore');
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

  constructor(transport) {
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

    privateData.set(this, {
      timeout: RPC_DEFAULT_TIMEOUT,
      waiting: {},
      transport,
      onAnswer,
      batch: null
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

  beginBatch(delay = 100) {
    pd(this).batch = [];
    pd(this).delay = delay;
    pd(this).batchTid = setTimeout(this.commitBatch, delay);
  }

  commitBatch(keepBatch = true) {
    const {
      batchTid, batch, delay, transport
    } = pd(this);
    if (batchTid) {
      clearTimeout(batchTid);
    }
    if (_.isArray(batch) && batch.length) {
      pd(this).batch = [];
      transport.serveRequest(batch);
    }
    if (keepBatch) {
      pd(this).batchTid = setTimeout(this.commitBatch, delay);
    }
  }

  endBatch() {
    this.commitBatch(false);
    pd(this).batch = null;
  }

  invoke(methodName, ...args) {
    return this.invokeA(methodName, args);
  }

  invokeA(methodName, args) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        method: methodName,
        params: args,
        id: RpcClient.generateId()
      };

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

      const { batch, transport } = pd(this);
      if (_.isArray(batch)) {
        batch.push(request);
      } else {
        transport.serveRequest(request);
      }
    });
  }
}

module.exports = RpcClient;
