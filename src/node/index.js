const authenticate = require("./authenticate");
const contents = require("./contents");
const preview = require("./preview");
const releases = require("./releases");
const { success, error, maybeParseJson } = require("./utils");
const packageJson = require("../../package.json");

/**
  This is a single API function that handles all requests made by
  authProvider and dataProvider.
**/
const proxy = async props => {
  // Common handling of props for all functions
  const prepared = Object.assign({}, props, {
    httpQuery: props.httpQuery ?? {},
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
  } else if (handler === "releases") {
    response = await releases(prepared);
  } else if (handler === "preview") {
    response = await preview(prepared);
  } else if (
    prepared.httpMethod === "GET" &&
    Object.keys(prepared.httpQuery).length === 0
  ) {
    response = success(200, {
      message: "This is the default response by the proxy function",
      version: packageJson.version
    });
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
