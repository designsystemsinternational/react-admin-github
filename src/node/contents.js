const path = require("path");
const jwtSimple = require("jwt-simple");
const { Octokit } = require("octokit");
const { Base64 } = require("js-base64");
const {
  withId,
  base64ToJson,
  jsonToBase64,
  createFilename,
  success,
  error,
  resourcePayload,
  removeExtraProperties
} = require("./utils");

/**
  Reads, creates, updates and deletes files from the GitHub contents API.
  Handles both normal files and smart handling of JSON files based on handler setting
**/
const contents = async props => {
  const { httpMethod, httpQuery, httpBody, httpHeaders, token, secret } = props;

  // Check auth header
  // --------------------------------------------------

  const authHeader =
    httpHeaders["Authorization"] ?? httpHeaders["authorization"];

  if (!authHeader) {
    return error(401, "No Authorization header found");
  }

  if (!authHeader.startsWith("Bearer")) {
    return error(401, "No Bearer token found in Authorization header");
  }

  // Decode JWT
  // --------------------------------------------------

  let user;
  try {
    const jwt = authHeader.substring(7, authHeader.length);
    user = jwtSimple.decode(jwt, secret);
  } catch (e) {
    return error(401, "Error decoding JWT");
  }

  if (!user.id) {
    return error(401, "Unauthorized");
  }

  // Handle request
  // --------------------------------------------------

  const octokit = new Octokit({ auth: token });

  if (httpMethod === "GET") {
    const { id, ids } = httpQuery;
    if (id) {
      return await getOne(octokit, props);
    } else if (ids) {
      return await getMany(octokit, props);
    } else {
      return await getList(octokit, props);
    }
  } else if (httpMethod === "PUT") {
    const { data } = httpBody;
    if (data.id) {
      return update(octokit, props);
    } else {
      return create(octokit, props);
    }
  } else if (httpMethod === "DELETE") {
    return del(octokit, props);
  } else {
    return error(404, "HTTP method not recognized");
  }
};

/**
  Gets a single resource by ID
**/
const getOne = async (octokit, props) => {
  const { repo } = props;
  const { resource, id, handler } = props.httpQuery;
  try {
    const response = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}/${id}`
    );
    return success(200, { data: resourcePayload(response.data, handler) });
  } catch (e) {
    return error(e.status, e.message);
  }
};

/**
  Gets multiple resources by ID
  The only way to do this with the GitHub api is to make a request per resource
  I think that's okay since this is often 2-5 resources being loaded.
**/
const getMany = async (octokit, props) => {
  const { repo } = props;
  const { resource, ids, handler } = props.httpQuery;
  try {
    const data = await Promise.all(
      JSON.parse(ids).map(id => {
        return octokit
          .request(`GET /repos/${repo}/contents/content/${resource}/${id}`)
          .then(response => {
            return resourcePayload(response.data, handler);
          });
      })
    );
    return success(200, { data });
  } catch (e) {
    return error(e.status, e.message);
  }
};

/**
  Gets a list of resources.
  Because neither the GitHub tree or contents API support pagination on files
  We load all and paginate in this API function. Not the greatest.
**/
const getList = async (octokit, props) => {
  const { repo, httpQuery } = props;
  const { resource, ids, sortField, sortOrder, handler } = httpQuery;
  const page = parseInt(httpQuery.page) ?? 1;
  const perPage = parseInt(httpQuery.perPage) ?? 10;

  try {
    const response = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}`
    );
    const { data } = response;

    const parsedData = data.map(file => resourcePayload(file, handler));

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

    return success(200, { data: pageData, total: data.length });
  } catch (e) {
    return error(e.status, e.message);
  }
};

/**
  Creates a resource
**/
const create = async (octokit, props) => {
  const { repo } = props;
  const { resource, data, handler } = props.httpBody;

  if (!data.name) {
    return error(404, "POST body needs a name property");
  }

  const filename = createFilename(data.name);

  const path = `content/${resource}/${filename}`;
  try {
    const response = await octokit.request(
      `PUT /repos/${repo}/contents/${path}`,
      {
        message: `Created resource: ${path}`,
        content: jsonToBase64(removeExtraProperties(data))
      }
    );

    let payload = null;
    if (response.data.content) {
      // On create or update, the API does not return contents,
      // so we add it manually via the extra option in resourcePayload
      payload = resourcePayload(response.data.content, handler, data);
    }

    return success(response.status, { data: payload });
  } catch (e) {
    return error(e.status, e.message);
  }
};

/**
  Updates a resource
**/
const update = async (octokit, props) => {
  const { repo, httpBody } = props;
  const { resource, data, handler } = httpBody;

  try {
    const getResponse = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}/${data.id}`
    );

    if (getResponse.status !== 200) {
      return error(getResponse.status, getResponse.data.message);
    }

    const response = await octokit.request(
      `PUT /repos/${repo}/contents/content/${resource}/${data.id}`,
      {
        message: `Updated resource: ${resource}/${data.id}`,
        content: jsonToBase64(removeExtraProperties(data)),
        sha: getResponse.data.sha
      }
    );

    if (response.status === 200) {
      // On create or update, the API does not return contents,
      // so we add it manually via the extra option in resourcePayload
      return success(response.status, {
        data: resourcePayload(response.data.content, handler, data)
      });
    } else {
      return error(response.status, response.data.message);
    }
  } catch (e) {
    return error(e.status, e.message);
  }
};

/**
  Deletes a resource
**/
const del = async (octokit, props) => {
  const { repo } = props;
  const { resource, id } = props.httpQuery;

  try {
    const getResponse = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}/${id}`
    );
    const response = await octokit.request(
      `DELETE /repos/${repo}/contents/content/${resource}/${id}`,
      {
        message: `Delete resource: ${resource}/${id}`,
        sha: getResponse.data.sha
      }
    );
    const data = base64ToJson(getResponse.data.content);
    return success(response.status ?? getResponse.status, { data });
  } catch (e) {
    return error(e.status, e.message);
  }
};

module.exports = contents;
