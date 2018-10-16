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

    const bindArgs = [port];
    if (address) {
      bindArgs.push(address);
    }
    socket.bind(...bindArgs);

    this.socket = socket;
  }

  closeSocket() {
    const { socket } = pd(this);
    this.socket = null;

    if (socket) {
      socket.close();
    }
  }

  set socket(socket) {
    const { socket: prevSocket, onListen, onMessage } = pd(this);
    if (prevSocket) {
      prevSocket.removeListener('listen', onListen);
      prevSocket.removeListener('message', onMessage);
    }

    if (socket) {
      const send = promisify(socket.send.bind(socket));
      _.extend(pd(this), { socket, send });

      socket.on('listen', onListen);
      socket.on('message', onMessage);
    } else {
      _.extend(pd(this), { socket: null, send: null });
    }
  }

  get socket() {
    const { socket } = pd(this);
    return socket;
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
