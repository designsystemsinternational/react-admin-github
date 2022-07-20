const { Base64 } = require("js-base64");
const slugify = require("slugify");
const path = require("path");

const withId = (data, id) => Object.assign({}, data, { id });

const base64ToJson = base64 => JSON.parse(Base64.decode(base64));
const jsonToBase64 = json => Base64.encode(JSON.stringify(json, null, 2));

const error = (statusCode, error) => ({ statusCode, body: { error } });
const success = (statusCode, body) => ({ statusCode, body });

/**
  Parses a JSON string into an object
  Passes everything straight through
**/
const maybeParseJson = str => {
  if (typeof str === "string" && str !== "") {
    return JSON.parse(str);
  }
  return str;
};

/**
  Adds a timestamp to an existing filename
**/
const createFilename = name => {
  return `${timestamp()}-${slugify(name, { lower: true, trim: true })}`;
};

/**
  These property values are never saved in JSON files, but instead
  added on the fly by the server.
**/
const extraProperties = ["id", "name", "path", "type", "createdAt", "slug"];

const removeExtraProperties = data => {
  const copy = Object.assign({}, data);
  for (let i = 0; i < extraProperties.length; i++) {
    delete copy[extraProperties[i]];
  }
  return copy;
};

/**
  Returns file info plus JSON contents of file if handler is json
**/
const resourcePayload = (responseData, handler, json) => {
  const payload = {
    id: responseData.name,
    name: responseData.name,
    path: responseData.path,
    type: responseData.type
  };

  // Check if filename has timestamp
  const nameSplit = responseData.name.split("-");
  if (nameSplit.length >= 7) {
    const [year, month, day, hour, minute, second, ...slugArray] = nameSplit;
    payload.createdAt = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    payload.slug = slugArray.join("-");
  }

  // Check if we should add JSON contents to payload
  if (
    (json || responseData.content) &&
    handler === "json" &&
    responseData.name.endsWith(".json")
  ) {
    const contents = json ?? base64ToJson(responseData.content);
    Object.assign(payload, contents);
  }

  return payload;
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
  base64ToJson,
  jsonToBase64,
  createFilename,
  error,
  success,
  maybeParseJson,
  resourcePayload,
  removeExtraProperties
};
