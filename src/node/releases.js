const jwtSimple = require("jwt-simple");
const { Octokit } = require("octokit");
const { Base64 } = require("js-base64");
const camelcaseKeys = require("camelcase-keys");
const {
  isAuthorized,
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
  Reads, creates, updates and deletes releases via the GitHub API
**/
const releases = async props => {
  const { httpMethod, httpQuery, httpHeaders, token, secret } = props;

  if (!isAuthorized(httpHeaders, secret)) {
    return error(404, "Unauthorized");
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
  } else if (httpMethod === "POST") {
    return create(octokit, props);
  } else if (httpMethod === "PUT") {
    return update(octokit, props);
  } else if (httpMethod === "DELETE") {
    return del(octokit, props);
  } else {
    return error(404, "HTTP method not recognized");
  }
};

/**
  Gets a single release by ID
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
  const { resource, handler } = httpQuery;
  const page = parseInt(httpQuery.page) ?? 1;
  const per_page = parseInt(httpQuery.perPage) ?? 10;

  let response;
  try {
    response = await octokit.request(`GET /repos/${repo}/releases`, {
      page,
      per_page
    });
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }

  const { data } = response;

  return success(200, {
    data: camelcaseKeys(response.data, { deep: true }),
    pageInfo: {
      hasPreviousPage: page > 1,
      hasNextPage: data.length === per_page
    }
  });
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

  data.id = `${timestamp()}-${data.id}`;
  const path = `content/${resource}/${data.id}`;
  await beforeSave(octokit, repo, data, handler, path);

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
  await beforeSave(octokit, repo, data, handler, path);

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

module.exports = releases;
