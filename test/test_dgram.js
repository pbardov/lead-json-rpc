/* global describe */
/* global after */
/* global it */
/* eslint-disable no-unused-expressions */

const process = require('process');

process.env.DEBUG = true;

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const { expect } = chai;

const { testIt } = require('./helpers');

const {
  RpcServer, RpcClient, ServerDgram, TransportDgram
} = require('../index');

const UDP_PORT = 3031;

const { asyncTimeout } = require('./helpers');
const standardTests = require('./standardTests');

describe('RpcServer test work with udp datagrams', function serverStreamTest() {
  this.timeout(2000);

  const rpc = new RpcServer();
  const srvDgram = new ServerDgram({ rpcServer: rpc, port: UDP_PORT });
  const transport = new TransportDgram({ port: UDP_PORT });
  const client = new RpcClient(transport);

  after(async () => {
    await asyncTimeout(1000);
    srvDgram.closeSocket();
  });

  standardTests({ rpc, client });

  it(
    'Big data test',
    testIt(async () => {
      let bigMsg = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
      while (bigMsg < 512000) {
        bigMsg += bigMsg;
      }
      const res = await client.invoke('echo', bigMsg);
      expect(res).to.equal(bigMsg);
    })
  );
});
