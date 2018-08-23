
const events = require('events');
const rp = require('request-promise-native');

class TransportHttp extends events.EventEmitter {
    constructor(apiUrl)
    {
        super();

        this.__apiUrl = apiUrl;
    }

    serveRequest(req)
    {
        this.__doRequest(req);
    }

    async __doRequest(req)
    {
        let ans;
        try {
            ans = await rp({
                url: this.__apiUrl,
                json: true,
                body: req
            });
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
