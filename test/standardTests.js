/* global it */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-param-reassign */

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const { expect, assert } = chai;
const { testIt, asyncTimeout } = require('./helpers');
const TestClass = require('./TestClass');

function standardTests({ rpc, client }) {
  const obj = new TestClass();

  it('Publish rpc methods', () => {
    rpc.regObject(obj, { namespace: 'obj' });
    rpc.regMethod(
      'echo',
      (s, delay = 0) => new Promise((resolve) => {
        setTimeout(() => {
          resolve(s);
        }, delay);
      })
    );
  });

  it(
    'Test method call',
    testIt(async () => {
      obj.n = 0;
      const r1 = client.invoke('obj.add', 10);
      const r2 = client.invoke('obj.sub', 3);
      const r3 = client.invoke('echo', 'haha');

      const [res1, res2] = await Promise.all([r1, r2]);
      assert(typeof res1 === 'number', 'result must be a number');
      assert(typeof res2 === 'number', 'result must be a number');
      expect(obj.n).to.equal(7);
      expect(await r3).to.equal('haha');
    })
  );

  it(
    'Test batch auto commit',
    testIt(async () => {
      client.beginBatch();

      obj.n = 0;

      const r1 = client.invoke('obj.add', 10);
      const r2 = client.invoke('obj.sub', 3);
      const r3 = client.invoke('echo', 'haha');

      await asyncTimeout(1000);

      const [res1, res2] = await Promise.all([r1, r2]);
      assert(typeof res1 === 'number', 'result must be a number');
      assert(typeof res2 === 'number', 'result must be a number');
      expect(obj.n).to.equal(7);
      expect(await r3).to.equal('haha');

      client.endBatch();
    })
  );

  it(
    'Test batch object autocommit',
    testIt(async () => {
      const batch = client.createBatch();

      obj.n = 0;

      const r1 = batch.invoke('obj.add', 10);
      const r2 = batch.invoke('obj.sub', 3);
      await asyncTimeout(500);
      const r3 = batch.invoke('echo', 'haha');

      await asyncTimeout(1000);

      const [res1, res2] = await Promise.all([r1, r2]);
      assert(typeof res1 === 'number', 'result must be a number');
      assert(typeof res2 === 'number', 'result must be a number');
      expect(obj.n).to.equal(7);
      expect(await r3).to.equal('haha');
    })
  );

  const auth = { key: 'my_key', secret: 'my_secret_phrase' };

  it(
    'Test auth',
    testIt(async () => {
      rpc.setAuth({ [auth.key]: auth.secret });

      let r;
      let e;
      try {
        r = await client.invoke('echo', 'must thrown');
      } catch (err) {
        e = err;
      }
      expect(e).to.exist;

      client.auth = auth;
      r = await client.invoke('echo', 'must no thrown');
      expect(r).to.equal('must no thrown');
    })
  );

  it('Test method not found error thrown', async () => {
    let r;
    let e;
    try {
      r = await client.invoke('obj.not_exist_method', 200);
    } catch (err) {
      e = err;
    }
    expect(e).to.exist;
    expect(r).to.be.undefined;
  });

  it('Test call method with bug', async () => {
    let r;
    let e;
    try {
      await client.invoke('obj.wrongMethod');
    } catch (err) {
      e = err;
    }

    expect(e).to.exist;
    expect(r).to.be.undefined;
    expect(e.code).to.be.within(-32099, -32000);
  });

  it('Test call timeout', async () => {
    client.timeout = 100;

    let r;
    let e;
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
}

module.exports = standardTests;
