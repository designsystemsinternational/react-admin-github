const { Octokit } = require("@octokit/core");
const { Base64 } = require("js-base64");
const {
  isAuthorized,
  base64ToJson,
  jsonToBase64,
  success,
  error,
  beforeResponse,
  beforeSave,
  getRawFile,
  uploadFile
} = require("./utils");

/**
  Reads, creates, updates and deletes files from the GitHub contents API.
  Handles both normal files and smart handling of JSON files based on handler setting
**/
const contents = async props => {
  const { httpMethod, httpQuery, httpHeaders, token, secret } = props;

  if (!isAuthorized(httpHeaders, secret)) {
    return error(404, "Unauthorized");
  }

  // Handle request
  // --------------------------------------------------

  const octokit = new Octokit({ auth: token });
  const { id, ids } = httpQuery;

  if (httpMethod === "GET") {
    if (id) {
      return await getOne(props, token);
    } else if (ids) {
      return await getMany(octokit, props, token);
    } else {
      return await getList(octokit, props);
    }
  } else if (httpMethod === "POST") {
    return create(octokit, props);
  } else if (httpMethod === "PUT") {
    return update(octokit, props);
  } else if (httpMethod === "DELETE") {
    if (id) {
      return del(octokit, props);
    } else if (ids) {
      return delMany(octokit, props);
    }
  }

  return error(404, "HTTP method not recognized");
};

/**
  Gets a single resource by ID
**/
const getOne = async (props, token) => {
  const { url, repo, secret } = props;
  const { resource, id, handler } = props.httpQuery;

  let response;
  try {
    response = await getRawFile({
      token,
      repo,
      path: `content/${resource}/${id}`
    });
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }

  const data = await beforeResponse(response.data, handler, url, secret);
  return success(200, { data });
};

/**
  Gets multiple resources by ID
  The only way to do this with the GitHub api is to make a request per resource
  I think that's okay since this is often 2-5 resources being loaded.
**/
const getMany = async (props, token) => {
  const { url, repo, secret } = props;
  const { resource, ids, handler } = props.httpQuery;

  try {
    const data = await Promise.all(
      JSON.parse(ids).map(id => {
        return getRawFile({
          token,
          repo,
          path: `content/${resource}/${id}`
        }).then(response => {
          return beforeResponse(response.data, handler, url, secret);
        });
      })
    );
    return success(200, { data });
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }
};

/**
  Gets a list of resources.
  Because neither the GitHub tree or contents API support pagination on files
  We load all and paginate in this API function. Not the greatest.
**/
const getList = async (octokit, props) => {
  const { url, repo, secret, httpQuery } = props;
  const { resource, sortField, sortOrder, handler } = httpQuery;
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
      return error(e.status ?? 500, e.message);
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

  if (!data.id) {
    return error(
      404,
      "POST body needs id property set to name of file to be created"
    );
  }

  const path = `content/${resource}/${data.id}`;
  await beforeSave(octokit, repo, resource, data, handler, path);

  let response;
  try {
    response = await octokit.request(`PUT /repos/${repo}/contents/${path}`, {
      message: `Created resource: ${path}`,
      content: jsonToBase64(data)
    });
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }

  if (response.status === 201) {
    const payload = await beforeResponse(
      response.data.content,
      handler,
      url,
      secret,
      data
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
  await beforeSave(octokit, repo, resource, data, handler, path);

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
      message: `Updated resource: ${path}`,
      content: jsonToBase64(data)
    });
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }

  if (response.status === 200) {
    const payload = await beforeResponse(
      response.data.content,
      handler,
      url,
      secret,
      data
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
      return error(response.status ?? 500, response.data.message);
    }
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }
};

/**
  Deletes several resources
**/
const delMany = async (octokit, props) => {
  const { repo, handler, url, secret } = props;
  const { resource } = props.httpQuery;
  const ids = props.httpQuery.ids.split(",");

  try {
    for (let i = 0; i < ids.length; i++) {
      const getResponse = await octokit.request(
        `GET /repos/${repo}/contents/content/${resource}/${ids[i]}`
      );
      await octokit.request(
        `DELETE /repos/${repo}/contents/content/${resource}/${ids[i]}`,
        {
          message: `Delete resource: ${resource}/${ids[i]}`,
          sha: getResponse.data.sha
        }
      );
    }
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }

  return success(200, { data: ids });
};

module.exports = contents;
