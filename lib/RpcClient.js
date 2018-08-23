
const RPC_DEFAULT_TIMEOUT = 5000;

class RpcClient {
    constructor(transport)
    {
        this.__timeout = RPC_DEFAULT_TIMEOUT;
        this.__waiting = {};
                
        this.__onAnswer = this.__onAnswer.bind(this);

        this.__transport = transport;
        this.__transport.on('jsonRpcAnswer', this.__onAnswer);
    }
    
    get timeout()
    {
        return this.__timeout;
    }
    
    set timeout(t)
    {
        this.__timeout = parseInt(t);
    }

    invoke(methodName, ...args)
    {
        return this.invokeA(methodName, args);
    }

    invokeA(methodName, args)
    {
        return new Promise((resolve, reject) => {
            const request = {
                jsonrpc: '2.0',
                method: methodName,
                params: args,
                id: this.__generateId()
            };
            
            const tid = setTimeout(() => {
                delete this.__waiting[request.id];
                reject(new Error('Timed out'));
            }, this.__timeout);
            
            this.__waiting[request.id] = (answer) => {
                clearTimeout(tid);
                delete this.__waiting[request.id];
                if (answer.error) {
                    const error = new Error(`[${answer.error.code}] ${answer.error.message}`);
                    reject(error);
                } else {
                    resolve(answer.result);
                }
            };
            
            this.__transport.serveRequest(request);
            
        });
    }

    __onAnswer(answer)
    {
        if (this.__waiting.hasOwnProperty(answer.id)) {
            this.__waiting[answer.id](answer);
        }
    }

    __generateId()
    {
        const now = new Date();
        const rnd = Math.floor(Math.random() * 1000);
        const id = `${now.getTime()}${rnd}`;
        return id;
    }
}

module.exports = RpcClient;
