const _ = require('underscore');

const privateData = new WeakMap();
function pd(obj) {
  return privateData.get(obj);
}

class BatchRpcRequest {
  constructor({ invoke, commit, autocommitDelay = 100 }) {
    privateData.set(this, {
      invoke,
      commit,
      autocommitDelay,
      batch: [],
      tid: null
    });

    this.startAutocommit();
  }

  startAutocommit() {
    const { autocommitDelay } = pd(this);
    if (!this.hasAutocommit() && autocommitDelay) {
      const { tid } = setTimeout(() => {
        _.extend(pd(this), { tid: null });
        this.end();
      }, autocommitDelay);
      _.extend(pd(this), { tid });
    }
  }

  stopAutocommit() {
    const { tid } = pd(this);
    if (tid) {
      clearTimeout(tid);
    }
    _.extend(pd(this), { tid: null });
  }

  hasAutocommit() {
    const { tid } = pd(this);
    return !!tid;
  }

  invoke(methodName, ...args) {
    const { invoke, batch } = pd(this);
    this.startAutocommit();
    const { result, request } = invoke(methodName, ...args);
    batch.push(request);
    return result;
  }

  end() {
    const { commit, batch } = pd(this);
    pd(this).batch = [];
    if (batch.length) {
      commit(batch);
      this.startAutocommit();
    }
  }
}

module.exports = BatchRpcRequest;
