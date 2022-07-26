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
  const { id, ids } = httpQuery;

  if (httpMethod === "GET") {
    if (id) {
      return await getOne(octokit, props);
    } else if (ids) {
      //return await getMany(octokit, props);
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
  Gets a single release by ID
**/
const getOne = async (octokit, props) => {
  const { url, repo, secret } = props;
  const { resource, id, handler } = props.httpQuery;

  let response;
  try {
    response = await octokit.request(`GET /repos/${repo}/releases/${id}`);
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }

  return success(200, { data: response.data });
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
  Creates a release
**/
const create = async (octokit, props) => {
  const { url, repo, secret } = props;
  const { resource, data, handler } = props.httpBody;

  let response;
  try {
    response = await octokit.request(`POST /repos/${repo}/releases`, {
      name: data.name ?? "Website release",
      body: data.body ?? "Another release of the website",
      prerelease: !!data.prerelease,
      tag_name: timestamp()
    });
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }

  if (response.status === 201) {
    return success(201, {
      data: response.data
    });
  } else {
    return error(response.status ?? 500, response.data.message);
  }
};

/**
  Updates a release
**/
const update = async (octokit, props) => {
  const { url, repo, secret } = props;
  const { resource, data, handler } = props.httpBody;

  let response;
  try {
    response = await octokit.request(
      `PATCH /repos/${repo}/releases/${data.id}`,
      data
    );
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }

  if (response.status === 200) {
    return success(200, {
      data: response.data
    });
  } else {
    return error(response.status ?? 500, response.data.message);
  }
};

/**
  Deletes a resource
**/
const del = async (octokit, props) => {
  const { repo, handler, url, secret } = props;
  const { id } = props.httpQuery;

  try {
    const response = await octokit.request(
      `DELETE /repos/${repo}/releases/${id}`
    );

    if (response.status === 204) {
      return success(200, { data: { id } });
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
  const ids = props.httpQuery.ids.split(",");

  try {
    for (let i = 0; i < ids.length; i++) {
      await octokit.request(`DELETE /repos/${repo}/releases/${ids[i]}`);
    }
  } catch (e) {
    return error(e.status ?? 500, e.message);
  }

  return success(200, { data: ids });
};

module.exports = releases;
