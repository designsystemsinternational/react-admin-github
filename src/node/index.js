const authenticate = require("./authenticate");
const contents = require("./contents");
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

  if (handler === "auth") {
    return authenticate(prepared);
  } else if (handler === "json" || handler === "file") {
    return contents(prepared);
    return res;
  } else {
    return error(404, "Wrong handler set in HTTP request:", handler);
  }
};

module.exports = proxy;
