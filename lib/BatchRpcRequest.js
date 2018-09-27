const privateData = new WeakMap();
function pd(obj) {
  return privateData.get(obj);
}

class BatchRpcRequest {
  constructor({
    invoke, commit, autocommitDelay = 100, refreshDelayOnInvoke = false
  }) {
    privateData.set(this, {
      invoke,
      commit,
      autocommitDelay,
      refreshDelayOnInvoke,
      batch: [],
      tid: null
    });

    this.setAutocommit();
  }

  setAutocommit() {
    const { autocommitDelay, tid } = pd(this);
    if (tid) {
      clearTimeout(tid);
    }
    pd(this).tid = setTimeout(() => {
      this.end();
      this.setAutocommit();
    }, autocommitDelay);
  }

  invoke(methodName, ...args) {
    const { invoke, batch, refreshDelayOnInvoke } = pd(this);
    if (refreshDelayOnInvoke) {
      this.setAutocommit();
    }
    const { result, request } = invoke(methodName, ...args);
    batch.push(request);
    return result;
  }

  async end() {
    const { commit, batch } = pd(this);
    pd(this).batch = [];
    await commit(batch);
  }
}

module.exports = BatchRpcRequest;
