const { EventEmitter } = require('events');
const udp = require('dgram');
const { promisify } = require('util');

const privateData = new WeakMap();
function pd(obj) {
  return privateData.get(obj);
}

class TransportDgram extends EventEmitter {
  constructor(options) {
    super();

    const onMessage = (msg) => {
      const ans = JSON.parse(msg.toString());
      this.emit('jsonRpcAnswer', ans);
    };

    const { address = 'localhost', port } = options;
    const socket = udp.createSocket('udp4');
    socket.on('message', onMessage);
    const send = promisify(socket.send.bind(socket));
    privateData.set(this, {
      address,
      port,
      socket,
      send,
      onMessage
    });
  }

  async serveRequest(req) {
    const { send, address, port } = pd(this);
    const json = JSON.stringify(req);
    await send(json, port, address);
  }
}

module.exports = TransportDgram;
