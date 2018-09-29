const { Duplex } = require('stream');
const StreamValues = require('stream-json/streamers/StreamValues');

const privateData = new WeakMap();
function pd(obj) {
  return privateData.get(obj);
}

class ServerStream extends Duplex {
  constructor(options) {
    super(options);

    const onRequest = async ({ value: req }) => {
      const { rpcServer, buffer, isBuffered } = pd(this);
      const answer = await rpcServer.serveRequest(req, false);
      const json = JSON.stringify(answer);
      if (isBuffered) {
        buffer.push(json);
      } else if (!this.push(json)) {
        pd(this).isBuffered = true;
      }
    };

    const { rpcServer } = options;
    const parser = StreamValues.withParser({ jsonStreaming: true });
    parser.on('data', onRequest);

    privateData.set(this, {
      rpcServer,
      parser,
      buffer: [],
      isBuffered: false
    });
  }

  _write(chunk, encoding, done) {
    const { parser } = pd(this);
    return parser.write(chunk, encoding, done);
  }

  _read() {
    const { buffer } = pd(this);
    pd(this).isBuffered = false;
    while (buffer.length) {
      const json = buffer.shift();
      this.push(json);
    }
  }
}

module.exports = ServerStream;
