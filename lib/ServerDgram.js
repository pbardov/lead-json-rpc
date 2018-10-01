const udp = require('dgram');
const { promisify } = require('util');
const _ = require('underscore');

const privateData = new WeakMap();
function pd(obj) {
  return privateData.get(obj);
}

class ServerDgram {
  constructor(options) {
    const onListen = () => {
      const { socket } = pd(this);
      const { address, port } = socket.address();
      _.extend(pd(this), { address, port });
    };

    const onMessage = async (msg, info) => {
      const { rpcServer, send } = pd(this);
      const { address, port } = info;
      const req = JSON.parse(msg.toString());
      const ans = await rpcServer.serveRequest(req, false);
      const json = JSON.stringify(ans);
      await send(json, port, address);
    };

    const {
      rpcServer, address, port, family
    } = options;
    privateData.set(this, { rpcServer, onListen, onMessage });
    if (port) {
      this.createSocket({ address, port, family });
    }
  }

  createSocket({ address, port, family = 'udp4' }) {
    this.closeSocket();

    const socket = udp.createSocket(family);
    const send = promisify(socket.send.bind(socket));
    _.extend(pd(this), { socket, send });

    const { onListen, onMessage } = pd(this);
    socket.on('listen', onListen);
    socket.on('message', onMessage);

    const bindArgs = [port];
    if (address) {
      bindArgs.push(address);
    }
    socket.bind(...bindArgs);
  }

  closeSocket() {
    const { socket } = pd(this);
    pd(this).socket = null;

    if (socket) {
      socket.close();
    }
  }

  get address() {
    return pd(this).address || null;
  }

  get port() {
    return pd(this).port || null;
  }

  get rpcServer() {
    return pd(this).rpcServer;
  }
}

module.exports = ServerDgram;
