const { Base64 } = require("js-base64");
const slugify = require("slugify");
const path = require("path");

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

/**
  Creates an ID string holding both a createdAt timestamp
  and a field value, so we can later extract this in the
  getList return without loading each individual file.
**/
const createId = (resource, data, resourceIds = {}) => {
  const idValue = data[resourceIds[resource]];
  let id;
  if (typeof idValue === "string") {
    id = slugify(idValue);
  } else if (typeof idValue === "number") {
    id = idValue.toString();
  } else {
    return null;
  }

  return `${timestamp()}-${slug}`;
};

/**
  Parses an ID string to a createdAt and field value
  It is currently a very simple way of destructuring the field value,
  and it would be nice to have a good non-destructive way of str > slug > str
**/
const parseId = (id, resource, resourceIds) => {
  const [year, month, day, hour, minute, second, ...fieldArray] = id.split("-");
  const fieldValue = fieldArray.join(" ");
  return {
    id,
    createdAt: `${year}-${month}-${day}T${hour}:${minute}:${second}Z`,
    [resourceIds[resource]]: fieldValue
  };
};

const timestamp = () => {
  const padTo2Digits = num => {
    return num.toString().padStart(2, "0");
  };

  const date = new Date();

  return [
    date.getUTCFullYear(),
    padTo2Digits(date.getUTCMonth() + 1),
    padTo2Digits(date.getUTCDate()),
    padTo2Digits(date.getUTCHours()),
    padTo2Digits(date.getUTCMinutes()),
    padTo2Digits(date.getUTCSeconds())
  ].join("-");
};

module.exports = {
  withId,
  ProxyError,
  base64ToJson,
  jsonToBase64,
  createId,
  parseId
};
