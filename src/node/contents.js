const jwtSimple = require("jwt-simple");
const { Octokit } = require("octokit");
const { Base64 } = require("js-base64");
const {
  base64ToJson,
  jsonToBase64,
  success,
  error,
  beforeResponse,
  beforeSave,
  uploadFile,
  timestamp
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
  const { url, repo, secret } = props;
  const { resource, id, handler } = props.httpQuery;

  let response;
  try {
    response = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}/${id}`
    );
  } catch (e) {
    return error(e.status, e.message);
  }

  const data = await beforeResponse(response.data, handler, url, secret);
  return success(200, { data });
};

/**
  Gets multiple resources by ID
  The only way to do this with the GitHub api is to make a request per resource
  I think that's okay since this is often 2-5 resources being loaded.
**/
const getMany = async (octokit, props) => {
  const { url, repo, secret } = props;
  const { resource, ids, handler } = props.httpQuery;
  try {
    const data = await Promise.all(
      JSON.parse(ids).map(id => {
        return octokit
          .request(`GET /repos/${repo}/contents/content/${resource}/${id}`)
          .then(response => {
            return beforeResponse(response.data, handler, url, secret);
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
  const { url, repo, secret, httpQuery } = props;
  const { resource, ids, sortField, sortOrder, handler } = httpQuery;
  const page = parseInt(httpQuery.page) ?? 1;
  const perPage = parseInt(httpQuery.perPage) ?? 10;

  let response;
  try {
    response = await octokit.request(
      `GET /repos/${repo}/contents/content/${resource}`
    );
  } catch (e) {
    // We allow the request to 404 in case you haven't created the resource folder yet
    if (e.status === 404) {
      response = { data: [] };
    } else {
      return error(e.status, e.message);
    }
  }

  const { data } = response;

  // If json handler, only return json files
  let filteredData = data;
  if (handler === "json") {
    filteredData = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i].name.endsWith(".json")) {
        filteredData.push(data[i]);
      }
    }
  }

  // Turn into payloads
  const parsedData = await Promise.all(
    filteredData.map(file => beforeResponse(file, handler, url, secret))
  );

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
};

/**
  Creates a resource
**/
const create = async (octokit, props) => {
  const { url, repo, secret } = props;
  const { resource, data, handler } = props.httpBody;

  if (!data.name) {
    return error(404, "POST body needs a name property");
  }

  data.name = `${timestamp()}-${data.name}`;
  const path = `content/${resource}/${data.name}`;
  const dataToSave = await beforeSave(octokit, repo, data, handler, path);

  let response;
  try {
    response = await octokit.request(`PUT /repos/${repo}/contents/${path}`, {
      message: `Created resource: ${path}`,
      content: jsonToBase64(dataToSave)
    });
  } catch (e) {
    return error(e.status, e.message);
  }

  if (response.status === 201) {
    const payload = await beforeResponse(
      response.data.content,
      handler,
      url,
      secret,
      dataToSave
    );
    return success(201, {
      data: payload
    });
  } else {
    return error(response.status, response.data.message);
  }
};

/**
  Updates a resource
**/
const update = async (octokit, props) => {
  const { url, repo, secret, httpBody } = props;
  const { resource, data, handler } = httpBody;

  const path = `content/${resource}/${data.id}`;
  const dataToSave = await beforeSave(octokit, repo, data, handler, path);

  let response;

  try {
    const getResponse = await octokit.request(
      `GET /repos/${repo}/contents/${path}`
    );

    if (getResponse.status !== 200) {
      return error(getResponse.status, getResponse.data.message);
    }

    response = await octokit.request(`PUT /repos/${repo}/contents/${path}`, {
      sha: getResponse.data.sha,
      message: `Updated resource: ${resource}/${data.id}`,
      content: jsonToBase64(dataToSave)
    });
  } catch (e) {
    return error(e.status, e.message);
  }

  if (response.status === 200) {
    const payload = await beforeResponse(
      response.data.content,
      handler,
      url,
      secret,
      dataToSave
    );
    return success(response.status, {
      data: payload
    });
  } else {
    return error(response.status, response.data.message);
  }
};

/**
  Deletes a resource
**/
const del = async (octokit, props) => {
  const { repo, handler, url, secret } = props;
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

    if (response.status === 200) {
      const payload = await beforeResponse(
        getResponse.data,
        handler,
        url,
        secret
      );
      return success(200, { data: payload });
    } else {
      return error(response.status, response.data.message);
    }
  } catch (e) {
    return error(e.status, e.message);
  }
};

module.exports = contents;
