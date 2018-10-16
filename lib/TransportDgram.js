const { EventEmitter } = require('events');
const udp = require('dgram');
const { promisify } = require('util');
const _ = require('underscore');

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

    const {
      address = 'localhost', port, family = 'udp4', createSocket = true
    } = options;

    privateData.set(this, {
      address,
      port,
      onMessage
    });

    if (createSocket) {
      const socket = udp.createSocket(family);
      this.socket = socket;
    }
  }

  async serveRequest(req) {
    const { send, address, port } = pd(this);
    const json = JSON.stringify(req);
    await send(json, port, address);
  }

  set socket(socket) {
    const { socket: prevSocket, onMessage } = pd(this);
    if (prevSocket) {
      prevSocket.removeListener('message', onMessage);
    }

    if (socket) {
      const send = promisify(socket.send.bind(socket));
      socket.on('message', onMessage);
      _.extend(pd(this), { socket, send });
    } else {
      _.extend(pd(this), { socket: null, send: null });
    }
  }

  get socket() {
    const { socket } = pd(this);
    return socket;
  }
}

module.exports = TransportDgram;
