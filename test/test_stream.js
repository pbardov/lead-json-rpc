/* global describe */
/* global after */
/* eslint-disable no-unused-expressions */

const process = require('process');

process.env.DEBUG = true;

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const {
  RpcServer, RpcClient, ServerStream, TransportStream
} = require('../index');

const { asyncTimeout } = require('./helpers');
const standardTests = require('./standardTests');

describe('RpcServer test work with streams', function serverStreamTest() {
  this.timeout(2000);

  const rpc = new RpcServer();
  const srvStream = new ServerStream({ rpcServer: rpc });
  const transport = new TransportStream({ stream: srvStream });
  const client = new RpcClient(transport);

  after(async () => {
    await asyncTimeout(1000);
    srvStream.end();
  });

  standardTests({ rpc, client });
});
