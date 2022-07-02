const path = require("path");
const jwtSimple = require("jwt-simple");
const { Octokit } = require("octokit");
const { Base64 } = require("js-base64");
const {
  withId,
  ProxyError,
  base64ToJson,
  jsonToBase64,
  createId
} = require("./utils");

const proxy = async ({
  repo,
  httpMethod,
  query,
  body,
  headers,
  token,
  secret,
  resourceIds
}) => {
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

  if (method === "GET") {
    const { resource, id } = query;
    if (id) {
      return await getOne(octokit, repo, resource, id);
    } else {
      return await getList(octokit, repo, resource);
    }
  } else if (method === "PUT") {
    const { resource, data } =
      typeof body === "string" ? JSON.parse(body) : body;
    if (data.id) {
      return update(octokit, repo, resource, data, resourceIds);
    } else {
      return create(octokit, repo, resource, data);
    }
  } else {
    return { statusCode: 500, body: { error: "HTTP method not recognized" } };
  }
};

const getOne = async (octokit, repo, resource, id) => {
  try {
    const response = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}/${id}.json`
    );
    const json = base64ToJson(response.data.content);
    return { statusCode: 200, body: { data: withId(json, id) } };
  } catch (e) {
    return { statusCode: e.status, body: { error: e.message } };
  }
};

const getList = async (octokit, repo, resource) => {
  try {
    const response = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}`
    );
    const data = response.data.map(file => {
      const id = path.basename(file.name, ".json");
      return { id };
    });
    return { statusCode: 200, body: { data, total: data.length } };
  } catch (e) {
    return { statusCode: e.status, body: { error: e.message } };
  }
};

const create = async (octokit, repo, resource, data, resourceIds) => {
  const id = createId(resource, data, resourceIds);
  if (!id) {
    return {
      statusCode: 500,
      body: { error: "Could not generate id field" }
    };
  }
  try {
    const response = await octokit.request(
      `PUT /repos/${repo}/contents/content/${resource}/${id}.json`,
      {
        message: `Resource created: ${resource}/${id}.json`,
        content: jsonToBase64(data)
      }
    );
    return { statusCode: response.status, body: { data: withId(data, id) } };
  } catch (e) {
    return { statusCode: e.status, body: { error: e.message } };
  }
};

const update = async (octokit, repo, resource, data) => {
  try {
    // load the sha
    const getResponse = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}/${data.id}.json`
    );
    const response = await octokit.request(
      `PUT /repos/${repo}/contents/content/${resource}/${data.id}.json`,
      {
        message: `Resource updated: ${resource}/${data.id}.json`,
        content: jsonToBase64(data),
        sha: getResponse.data.sha
      }
    );
    return {
      statusCode: response.status ?? getResponse.status,
      body: { data }
    };
  } catch (e) {
    return { statusCode: e.status, body: { error: e.message } };
  }
};

module.exports = proxy;
