/* global describe */
/* global it */
/* eslint-disable no-unused-expressions */

const process = require('process');

process.env.DEBUG = true;

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const { expect } = chai;

const { RpcServer } = require('../index');
const TestClass = require('./TestClass');

const { testIt } = require('./helpers');

describe('RpcServer logic test', function testLogic() {
  this.timeout(2000);

  let rpc;
  let obj;
  it('Test create rpc server', () => {
    rpc = new RpcServer();
    obj = new TestClass();

    expect(rpc).to.be.exist;
    rpc.regObject(obj, { namespace: 'obj' });
    rpc.regMethod('echo', s => s);
  });

  let jsonrpcVersion = '2.0';
  async function doRpcCall(method, ...args) {
    const now = new Date();
    const request = {
      jsonrpc: jsonrpcVersion,
      method,
      params: args,
      id: `${now.getTime()}${Math.random() * 1000}`
    };

    const rawAnswer = await rpc.serveRequest(JSON.stringify(request));
    const answer = JSON.parse(rawAnswer);
    return answer;
  }

  it(
    'Test method call',
    testIt(async () => {
      const r1 = await doRpcCall('obj.add', 10);
      expect(r1.result).to.equal(10);
      const r2 = await doRpcCall('obj.sub', 3);
      expect(r2.result).to.equal(7);
      expect(obj.n).to.equal(7);
      const r3 = await doRpcCall('echo', 'haha');
      expect(r3.result).to.equal('haha');
    })
  );

  it('Test method not found error thrown', async () => {
    const r = await doRpcCall('obj.not_exist_method', 200);
    expect(r.error).to.have.property('code');
    expect(r.error).to.have.property('message');
    expect(r.error.code).to.equal(-32601);
  });

  it('Test invalid request error thrown', async () => {
    jsonrpcVersion = '1.4';
    const r = await doRpcCall('obj.add', 10);
    jsonrpcVersion = '2.0';

    expect(r.error).to.have.property('code');
    expect(r.error).to.have.property('message');
    expect(r.error.code).to.equal(-32600);
  });

  it('Test call method with bug', async () => {
    const r = await doRpcCall('obj.wrongMethod');

    expect(r.error).to.have.property('code');
    expect(r.error).to.have.property('message');
    expect(r.error.code).to.be.within(-32099, -32000);
  });
});
