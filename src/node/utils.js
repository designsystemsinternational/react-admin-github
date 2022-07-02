const { Base64 } = require("js-base64");
const slugify = require("slugify");

class ProxyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ProxyError";
  }
}

const withId = (data, id) => Object.assign({}, data, { id });

const base64ToJson = base64 => JSON.parse(Base64.decode(base64));
const jsonToBase64 = json => Base64.encode(JSON.stringify(json, null, 2));

const createId = (resource, data, resourceIds = {}) => {
  const idValue =
    data[resourceIds[resource]] ??
    data.id ??
    data.title ??
    data.name ??
    data.fullName;

  if (typeof idValue === "string") {
    return slugify(idValue).toLowerCase();
  } else if (typeof idValue === "number") {
    return idValue.toString();
  }
};

module.exports = {
  withId,
  ProxyError,
  base64ToJson,
  jsonToBase64,
  createId
};
