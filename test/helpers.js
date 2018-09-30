function asyncTimeout(ival) {
  return new Promise((resolve) => {
    setTimeout(resolve, ival);
  });
}

function testIt(func) {
  return () => new Promise((resolve, reject) => {
    const thenable = { then: _resolve => _resolve(func()) };
    Promise.resolve(thenable)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        console.error('Error: \n', err);
        reject(err);
      });
  });
}

module.exports = {
  asyncTimeout,
  testIt
};
