/* global Promise */

const process = require('process');

process.env.DEBUG = true;

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();

function testIt(func) {
    return () => {
        return new Promise((resolve, reject) => {
            const thenable = {then: (_resolve) => _resolve(func())};
            Promise.resolve(thenable)
                    .then((res) => {
                        resolve(res);
                    })
                    .catch((err) => {
                        console.error('Error: \n', err);
                        reject(err);
                    });
        });
    };
}

const RpcServer = require('../lib/RpcServer');

class MyClass {
    constructor(num)
    {
        this.n = num || 0;
    }
    
    add(num)
    {
        this.n += num;
        return this.n;
    }
    
    sub(num)
    {
        this.n -= num;
        return this.n;
    }
    
    inc()
    {
        return ++this.n;
    }
    
    dec()
    {
        return --this.n;
    }
    
    wrongMethod()
    {
        return neObj.neMethod(1234);
    }
}

describe('RpcServer test', function () {
    this.timeout(2000);
    
    let rpc, obj;
    it('Test create rpc server', () => {
        rpc = new RpcServer;
        obj = new MyClass;
        
        expect(rpc).to.be.exist;
        rpc.regObject(obj, {namespace: 'obj'});
        rpc.regMethod('echo', (s) => {
            return s;
        });
    });
    
    let jsonrpcVersion = '2.0';
    async function doRpcCall(method, ...args) {
        const now = new Date();
        const request = {
            jsonrpc: jsonrpcVersion,
            method: method,
            params: args,
            id: `${now.getTime()}${Math.random() * 1000}`
        };
        
//        console.log('request: \n', request);
        
        const rawAnswer = await rpc.serveRequest(JSON.stringify(request));
        
        const answer = JSON.parse(rawAnswer);
        
//        console.log('answer: \n', answer);
        return answer;
    }
    
    it('Test method call', testIt(async () => {
        let r1 = await doRpcCall('obj.add', 10);
        expect(r1.result).to.equal(10);
        let r2 = await doRpcCall('obj.sub', 3);
        expect(r2.result).to.equal(7);
        expect(obj.n).to.equal(7);
        let r3 = await doRpcCall('echo', 'haha');
        expect(r3.result).to.equal('haha');
    }));
    
    it('Test method not found error thrown', async () => {
        let r = await doRpcCall('obj.not_exist_method', 200);
        expect(r.error).to.have.property('code');
        expect(r.error).to.have.property('message');
        expect(r.error.code).to.equal(-32601);
    });
    
    it('Test invalid request error thrown', async () => {
        jsonrpcVersion = '1.4';
        let r = await doRpcCall('obj.add', 10);
        jsonrpcVersion = '2.0';
        
        expect(r.error).to.have.property('code');
        expect(r.error).to.have.property('message');
        expect(r.error.code).to.equal(-32600);
    });
    
    it('Test call method with bug', async () => {
        let r = await doRpcCall('obj.wrongMethod');
        
        expect(r.error).to.have.property('code');
        expect(r.error).to.have.property('message');
        expect(r.error.code).to.be.within(-32099, -32000);
    });
});
