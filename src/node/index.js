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
  const action =
    prepared.httpQuery && prepared.httpQuery.action
      ? prepared.httpQuery.action
      : prepared.httpBody
      ? prepared.httpBody.action
      : null;

  if (action === "authenticate") {
    return authenticate(prepared);
  } else if (action === "contents") {
    return contents(prepared);
    return res;
  } else {
    return error(404, "Wrong action set in HTTP request");
  }
};

module.exports = proxy;
