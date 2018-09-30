/* global describe */
/* global after */
/* eslint-disable no-unused-expressions */

const process = require('process');

process.env.DEBUG = true;

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const express = require('express');
const bodyParser = require('body-parser');
const {
  RpcServer, RpcClient, expressMiddleware, TransportHttp
} = require('../index');
const standardTests = require('./standardTests');

describe('RpcServer express middleware test', function testExpressMiddleware() {
  this.timeout(2000);

  const httpPort = 8088;
  const apiUrl = `http://localhost:${httpPort}/api`;

  const app = express();
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

  const rpc = new RpcServer();
  app.use('/api', expressMiddleware(rpc));
  const httpServer = app.listen(httpPort);

  const transport = new TransportHttp(apiUrl);
  const client = new RpcClient(transport);

  after(async () => {
    this.timeout(5000);
    if (httpServer) {
      httpServer.close();
    }
  });

  standardTests({ rpc, client });
});
