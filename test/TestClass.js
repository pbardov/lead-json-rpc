class TestClass {
  constructor(num) {
    this.n = num || 0;
  }

  add(num) {
    this.n += num;
    return this.n;
  }

  sub(num) {
    this.n -= num;
    return this.n;
  }

  inc() {
    this.n += 1;
    return this.n;
  }

  dec() {
    this.n -= 1;
    return this.n;
  }

  wrongMethod() {
    return neObj.neMethod(1234); // eslint-disable-line
  }
}

module.exports = TestClass;
