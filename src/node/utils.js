const { Base64 } = require("js-base64");

class ProxyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ProxyError";
  }
}

const withId = (data, id) => Object.assign({}, data, { id });

const base64ToJson = base64 => JSON.parse(Base64.decode(base64));

module.exports = {
  withId,
  ProxyError,
  base64ToJson
};
