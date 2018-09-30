/* global describe */
/* global after */
/* eslint-disable no-unused-expressions */

const process = require('process');

process.env.DEBUG = true;

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const {
  RpcServer, RpcClient, ServerDgram, TransportDgram
} = require('../index');

const UDP_PORT = 3031;

const { asyncTimeout } = require('./helpers');
const standardTests = require('./standardTests');

describe('RpcServer test work with udp datagrams', function serverStreamTest() {
  this.timeout(2000);

  const rpc = new RpcServer();
  const srvDgram = new ServerDgram({ rpcServer: rpc, bindPort: UDP_PORT });
  const transport = new TransportDgram({ port: UDP_PORT });
  const client = new RpcClient(transport);

  after(async () => {
    await asyncTimeout(1000);
    srvDgram.closeSocket();
  });

  standardTests({ rpc, client });
});
