const authenticate = require("./authenticate");
const contents = require("./contents");
const preview = require("./preview");
const { error, maybeParseJson } = require("./utils");

/**
  This is a single API function that handles all requests made by
  authProvider and dataProvider.
**/
const proxy = async props => {
  // Common handling of props for all functions
  const prepared = Object.assign({}, props, {
    httpMethod: props.httpMethod.toUpperCase(),
    httpBody: maybeParseJson(props.httpBody)
  });

  // Handle the request
  const handler =
    prepared.httpQuery && prepared.httpQuery.handler
      ? prepared.httpQuery.handler
      : prepared.httpBody
      ? prepared.httpBody.handler
      : null;

  let response;

  if (handler === "auth") {
    response = await authenticate(prepared);
  } else if (handler === "json" || handler === "file") {
    response = await contents(prepared);
  } else if (handler === "preview") {
    response = await preview(prepared);
  } else {
    response = error(404, "Wrong handler set in HTTP request:", handler);
  }

  // If body is an object, we expect it to be converted to JSON string
  if (typeof response.body === "object") {
    response.body = JSON.stringify(response.body);
  }

  return response;
};

module.exports = proxy;
