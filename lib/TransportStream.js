const { EventEmitter } = require('events');
const StreamValues = require('stream-json/streamers/StreamValues');

const privateData = new WeakMap();
function pd(obj) {
  return privateData.get(obj);
}

class TransportStream extends EventEmitter {
  constructor(options) {
    super();

    const parser = StreamValues.withParser({ jsonStreaming: true });
    parser.on('data', ({ value: ans }) => {
      this.emit('jsonRpcAnswer', ans);
    });

    privateData.set(this, {
      parser
    });

    this.attachStream(options);
  }

  attachStream(options) {
    const stream = options.stream || null;
    const { readStream = stream, writeStream = stream } = options;
    const { parser } = pd(this);
    if (pd(this).readStream) {
      pd(this).readStream.unpipe(parser);
    }
    pd(this).readStream = readStream;
    pd(this).writeStream = writeStream;
    readStream.pipe(parser);
  }

  serveRequest(req) {
    const { writeStream } = pd(this);
    writeStream.write(JSON.stringify(req));
  }
}

module.exports = TransportStream;
