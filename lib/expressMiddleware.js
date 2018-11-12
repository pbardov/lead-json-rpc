async function serveRequest(rpcSrv, req, res) {
  const reqinfo = { proto: 'http', address: req.ip, req };
  const answer = await rpcSrv.serveRequest(req.body, false, reqinfo);
  res.json(answer);
}

function expressMiddleware(rpcSrv) {
  const handler = (req, res, next) => {
    serveRequest(rpcSrv, req, res, next);
  };

  return handler;
}

module.exports = expressMiddleware;
