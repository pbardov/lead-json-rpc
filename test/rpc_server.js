/* eslint-disable */
/* global Promise */
/* global it */
/* global describe */

const process = require('process');

process.env.DEBUG = true;

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const { assert, expect } = chai;
const should = chai.should();

function asyncTimeout(ival) {
  return new Promise(resolve => {
    setTimeout(resolve, ival);
  });
}

function testIt(func) {
  return () =>
    new Promise((resolve, reject) => {
      const thenable = { then: _resolve => _resolve(func()) };
      Promise.resolve(thenable)
        .then(res => {
          resolve(res);
        })
        .catch(err => {
          console.error('Error: \n', err);
          reject(err);
        });
    });
}

const { RpcServer } = require('../index');

class MyClass {
  constructor(num) {
    this.n = num || 0;
  }

  add(num) {
    this.n += num;
    return this.n;
  }

  sub(num) {
    this.n -= num;
    return this.n;
  }

  inc() {
    return ++this.n;
  }

  dec() {
    return --this.n;
  }

  wrongMethod() {
    return neObj.neMethod(1234);
  }
}

describe('RpcServer test', function() {
  this.timeout(2000);

  let rpc, obj;
  it('Test create rpc server', () => {
    rpc = new RpcServer();
    obj = new MyClass();

    expect(rpc).to.be.exist;
    rpc.regObject(obj, { namespace: 'obj' });
    rpc.regMethod('echo', s => {
      return s;
    });
  });

  let jsonrpcVersion = '2.0';
  async function doRpcCall(method, ...args) {
    const now = new Date();
    const request = {
      jsonrpc: jsonrpcVersion,
      method: method,
      params: args,
      id: `${now.getTime()}${Math.random() * 1000}`
    };

    //        console.log('request: \n', request);

    const rawAnswer = await rpc.serveRequest(JSON.stringify(request));

    const answer = JSON.parse(rawAnswer);

    //        console.log('answer: \n', answer);
    return answer;
  }

  it(
    'Test method call',
    testIt(async () => {
      let r1 = await doRpcCall('obj.add', 10);
      expect(r1.result).to.equal(10);
      let r2 = await doRpcCall('obj.sub', 3);
      expect(r2.result).to.equal(7);
      expect(obj.n).to.equal(7);
      let r3 = await doRpcCall('echo', 'haha');
      expect(r3.result).to.equal('haha');
    })
  );

  it('Test method not found error thrown', async () => {
    let r = await doRpcCall('obj.not_exist_method', 200);
    expect(r.error).to.have.property('code');
    expect(r.error).to.have.property('message');
    expect(r.error.code).to.equal(-32601);
  });

  it('Test invalid request error thrown', async () => {
    jsonrpcVersion = '1.4';
    let r = await doRpcCall('obj.add', 10);
    jsonrpcVersion = '2.0';

    expect(r.error).to.have.property('code');
    expect(r.error).to.have.property('message');
    expect(r.error.code).to.equal(-32600);
  });

  it('Test call method with bug', async () => {
    let r = await doRpcCall('obj.wrongMethod');

    expect(r.error).to.have.property('code');
    expect(r.error).to.have.property('message');
    expect(r.error.code).to.be.within(-32099, -32000);
  });
});

const express = require('express');
const bodyParser = require('body-parser');
const { expressMiddleware } = require('../index');
const { RpcClient } = require('../index');
const { TransportHttp } = require('../index');

describe('RpcServer express middleware test', function() {
  this.timeout(2000);

  after(async function() {
    this.timeout(5000);

    process.exit();
  });

  const httpPort = 8088;
  const apiUrl = `http://localhost:${httpPort}/api`;

  let app;
  it('Test create express app', () => {
    app = express();

    const rawBodySaver = (req, res, buf, encoding) => {
      if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
      }
    };

    app.use(bodyParser.json({ verify: rawBodySaver }));
    app.use(bodyParser.urlencoded({ verify: rawBodySaver, extended: true }));
    app.use(
      bodyParser.raw({
        verify: rawBodySaver,
        type() {
          return true;
        }
      })
    );
  });

  let rpc, obj;
  it('Test create rpc server', () => {
    rpc = new RpcServer();
    obj = new MyClass();

    expect(rpc).to.be.exist;
    rpc.regObject(obj, { namespace: 'obj' });
    rpc.regMethod('echo', (s, delay = 0) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(s);
        }, delay);
      });
    });
  });

  it('Test register rpc middleware', () => {
    // app.use('/api', (req, res, next) => {
    //   console.log('request headers = ', req.headers);
    //   console.log('req.body = \n', req.body);
    //   console.log('req.rawBody = \n', req.rawBody ? req.rawBody.toString() : null);
    //   next();
    // });

    app.use('/api', expressMiddleware(rpc));
  });

  it('Test start express http server', done => {
    app.listen(httpPort, () => done());
  });

  let client;
  it('Test create client', () => {
    const transport = new TransportHttp(apiUrl);
    client = new RpcClient(transport);

    expect(client).to.exist;
  });

  it(
    'Test method call',
    testIt(async () => {
      let r1 = client.invoke('obj.add', 10);
      let r2 = client.invoke('obj.sub', 3);
      let r3 = client.invoke('echo', 'haha');
      expect(await r1).to.equal(10);
      expect(await r2).to.equal(7);
      expect(obj.n).to.equal(7);
      expect(await r3).to.equal('haha');
    })
  );

  it(
    'Test batch auto commit',
    testIt(async () => {
      client.beginBatch();

      obj.n = 0;

      let r1 = client.invoke('obj.add', 10);
      let r2 = client.invoke('obj.sub', 3);
      let r3 = client.invoke('echo', 'haha');

      await asyncTimeout(1000);

      expect(await r1).to.equal(10);
      expect(await r2).to.equal(7);
      expect(obj.n).to.equal(7);
      expect(await r3).to.equal('haha');

      client.endBatch();
    })
  );

  it('Test method not found error thrown', async () => {
    let r, e;
    try {
      r = await client.invoke('obj.not_exist_method', 200);
    } catch (err) {
      e = err;
    }
    expect(e).to.exist;
    expect(r).to.be.undefined;

    console.log('Error object output (not a error): \n', e);
  });

  it('Test call method with bug', async () => {
    let r, e;
    try {
      let r = await client.invoke('obj.wrongMethod');
    } catch (err) {
      e = err;
    }

    expect(e).to.exist;
    expect(r).to.be.undefined;
    expect(e.code).to.be.within(-32099, -32000);

    console.log('Error object output (not a error): \n', e);
  });

  it('Test call timeout', async () => {
    client.timeout = 100;

    let r, e;
    try {
      r = await client.invoke('echo', 'hello world!', 500);
    } catch (err) {
      e = err;
    }

    client.timeout = 5000;

    expect(e).to.exist;
    expect(r).to.be.undefined;
    expect(e.message).to.equal('Timed out');
  });
});
