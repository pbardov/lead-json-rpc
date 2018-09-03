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
      if (Object.prototype.hasOwnProperty.call(pd(this).waiting, answer.id)) {
        pd(this).waiting[answer.id](answer);
      }
    }.bind(this);

    privateData.set(this, {
      timeout: RPC_DEFAULT_TIMEOUT,
      waiting: {},
      transport,
      onAnswer
    });

    this.transport = transport;
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

      pd(this).transport.serveRequest(request);
    });
  }
}

module.exports = RpcClient;
