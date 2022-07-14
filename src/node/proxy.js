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
    const { resource, id, ids } = query;
    if (id) {
      return await getOne(octokit, repo, resource, id);
    } else if (ids) {
      return await getMany(octokit, repo, resource, ids);
    } else {
      return await getList(octokit, repo, resource, resourceIds, query);
    }
  } else if (method === "PUT") {
    const { resource, data } =
      typeof body === "string" ? JSON.parse(body) : body;
    if (data.id) {
      return update(octokit, repo, resource, data, resourceIds);
    } else {
      return create(octokit, repo, resource, data, resourceIds);
    }
  } else if (method === "DELETE") {
    const { resource, id } = query;
    return del(octokit, repo, resource, id);
  } else {
    return { statusCode: 500, body: { error: "HTTP method not recognized" } };
  }
};

/**
  Gets a single resource by ID
**/
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
  Gets multiple resources by ID
  The only way to do this with the GitHub api is to make a request per resource
  I think that's okay since this is often 2-5 resources being loaded.
**/
const getMany = async (octokit, repo, resource, ids) => {
  try {
    const data = await Promise.all(
      JSON.parse(ids).map(id => {
        return octokit
          .request(`GET /repos/${repo}/contents/content/${resource}/${id}.json`)
          .then(response => {
            const json = base64ToJson(response.data.content);
            return withId(json, id);
          });
      })
    );
    return { statusCode: 200, body: { data } };
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
  const { sortField, sortOrder } = query;

  try {
    const response = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}`
    );
    const { data } = response;

    // Turn filenames into data objects
    const parsedData = data
      .slice()
      .filter(file => file.name.endsWith("json"))
      .map(file => {
        const id = path.basename(file.name, ".json");
        return parseId(id, resource, resourceIds);
      });

    // Sort depending on the sort order
    const isAsc = sortOrder === "ASC";
    parsedData.sort((a, b) => {
      if (a[sortField] < b[sortField]) {
        return isAsc ? -1 : 1;
      } else if (a[sortField] > b[sortField]) {
        return isAsc ? 1 : -1;
      } else {
        return 0;
      }
    });

    // Pagination
    const pageStartIdx = (page - 1) * perPage;
    const pageEndIdx = pageStartIdx + perPage;
    const pageData = parsedData.slice(pageStartIdx, pageEndIdx);

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
