const path = require("path");
const jwtSimple = require("jwt-simple");
const { Octokit } = require("octokit");
const { Base64 } = require("js-base64");
const { withId, ProxyError, base64ToJson } = require("./utils");

const proxy = async ({ repo, httpMethod, query, headers, token, secret }) => {
  // Check that auth is correct
  const authHeader = headers["Authorization"] ?? headers["authorization"];
  if (!authHeader) {
    throw new ProxyError(401, "No Authorization header found");
  }

  if (!authHeader.startsWith("Bearer")) {
    throw new ProxyError(401, "No Bearer token found in Authorization header");
  }

  let user;
  try {
    const jwt = authHeader.substring(7, authHeader.length);
    user = jwtSimple.decode(jwt, secret);
  } catch (e) {
    throw new ProxyError(401, "Error decoding JWT");
  }

  if (!user.id) {
    throw new ProxyError(401, "Unauthorized");
  }

  const octokit = new Octokit({ auth: token });
  const method = httpMethod.toUpperCase();
  const { resource, id } = query;

  if (method === "GET") {
    if (id) {
      try {
        const response = await octokit.request(
          `GET /repos/${repo}/contents/content/${resource}/${id}.json`
        );
        const json = base64ToJson(response.data.content);
        return { data: withId(json, id) };
      } catch (e) {
        throw new ProxyError(e.status, e.message);
      }
    } else {
      try {
        const response = await octokit.request(
          `GET /repos/${repo}/contents/content/${resource}`
        );
        const data = response.data.map(file => {
          const id = path.basename(file.name, ".json");
          return { id };
        });
        return { data, total: data.length };
      } catch (e) {
        throw new ProxyError(e.status, e.message);
      }
    }
  } else if (method === "POST") {
  } else if (method === "PATCH") {
  } else {
    throw new Error("HTTP method not rexognized: ", method);
  }
};

module.exports = proxy;
