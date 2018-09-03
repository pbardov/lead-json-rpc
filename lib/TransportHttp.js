const { EventEmitter } = require('events');
const request = require('superagent');

class TransportHttp extends EventEmitter {
  constructor(apiUrl) {
    super();

    this.apiUrl = apiUrl;
  }

  serveRequest(req) {
    return this.doRequest(req);
  }

  async doRequest(req) {
    let ans;
    try {
      const res = await request
        .post(this.apiUrl)
        .set('Content-Type', 'application/json')
        .send(req);
      ans = res.body;
    } catch (err) {
      ans = {
        jsonrpc: '2.0',
        result: null,
        error: {
          message: err.toString(),
          code: -32603
        },
        id: req.id
      };
    }

    this.emit('jsonRpcAnswer', ans);
  }
}

module.exports = TransportHttp;
