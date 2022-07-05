const path = require("path");
const jwtSimple = require("jwt-simple");
const { Octokit } = require("octokit");
const { Base64 } = require("js-base64");
const {
  withId,
  ProxyError,
  base64ToJson,
  jsonToBase64,
  createId,
  parseId
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
      return await getList(octokit, repo, resource, resourceIds, query);
    }
  } else if (method === "PUT") {
    const { resource, data } =
      typeof body === "string" ? JSON.parse(body) : body;
    if (data.id) {
      return update(octokit, repo, resource, data, resourceIds);
    } else {
      return create(octokit, repo, resource, data);
    }
  } else if (method === "DELETE") {
    const { resource, id } = query;
    return del(octokit, repo, resource, id);
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

/**
  Gets a list of resources.
  Because neither the GitHub tree or contents API support pagination on files
  We load all and paginate in this API function. Not the greatest.
**/
const getList = async (octokit, repo, resource, resourceIds, query) => {
  const page = parseInt(query.page) ?? 1;
  const perPage = parseInt(query.perPage) ?? 10;
  try {
    const response = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}`
    );
    const { data } = response;
    const pageStartIdx = (page - 1) * perPage;
    const pageEndIdx = pageStartIdx + perPage;
    const pageData = data.slice(pageStartIdx, pageEndIdx).map(file => {
      const id = path.basename(file.name, ".json");
      return parseId(id, resource, resourceIds);
    });
    return { statusCode: 200, body: { data: pageData, total: data.length } };
  } catch (e) {
    return { statusCode: e.status, body: { error: e.message } };
  }
};

const create = async (octokit, repo, resource, data, resourceIds) => {
  const id = createId(resource, data, resourceIds);
  if (!id) {
    return {
      statusCode: 500,
      body: { error: "Could not generate id for resource" }
    };
  }
  const path = `content/${resource}/${id}.json`;
  try {
    const response = await octokit.request(
      `PUT /repos/${repo}/contents/${path}`,
      {
        message: `Created resource: ${path}`,
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
    const getResponse = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}/${data.id}.json`
    );
    const response = await octokit.request(
      `PUT /repos/${repo}/contents/content/${resource}/${data.id}.json`,
      {
        message: `Updated resource: ${resource}/${data.id}.json`,
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

const del = async (octokit, repo, resource, id) => {
  try {
    const getResponse = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}/${id}.json`
    );
    const response = await octokit.request(
      `DELETE /repos/${repo}/contents/content/${resource}/${id}.json`,
      {
        message: `Delete resource: ${resource}/${id}.json`,
        sha: getResponse.data.sha
      }
    );
    const data = base64ToJson(getResponse.data.content);
    return {
      statusCode: response.status ?? getResponse.status,
      body: { data }
    };
  } catch (e) {
    return { statusCode: e.status, body: { error: e.message } };
  }
};

module.exports = proxy;
