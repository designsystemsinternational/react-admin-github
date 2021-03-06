import slugify from "slugify";
import { changeObjects } from "../shared/utils";

/**
  Defaults
**/

const defaultSettings = {
  filesPath: "files"
};

const defaultResourceSettings = {
  handler: "file"
};

export const getSettings = settings => {
  if (settings) {
    return Object.assign({}, defaultSettings, settings);
  }
  return defaultSettings;
};

export const getResourceSettings = (settings, resource) => {
  if (settings?.resources?.[resource]) {
    return Object.assign(
      {},
      defaultResourceSettings,
      settings.resources[resource]
    );
  }
  return defaultResourceSettings;
};

/**
  Make a GET request with fetch
  Returns a promise that:
  - on success: resolves with the data
  - on error: rejects with the data.error message
**/
export const get = (url, query) => {
  const urlWithQuery = url + "?" + new URLSearchParams(query);
  return fetch(urlWithQuery, {
    method: "GET",
    headers: getHeaders()
  })
    .then(response =>
      response.json().then(resbody => ({ ok: response.ok, resbody }))
    )
    .then(({ ok, resbody }) => {
      if (!ok) {
        throw new Error(resbody.error);
      }
      return resbody;
    });
};

/**
  Make a POST request with fetch
**/
export const post = (url, body) => {
  return fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body)
  })
    .then(response =>
      response.json().then(resbody => ({ ok: response.ok, resbody }))
    )
    .then(({ ok, resbody }) => {
      if (!ok) {
        throw new Error(resbody.error);
      }
      return resbody;
    });
};

/**
  Make a PUT request with fetch
**/
export const put = (url, body) => {
  return fetch(url, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body)
  })
    .then(response =>
      response.json().then(resbody => ({ ok: response.ok, resbody }))
    )
    .then(({ ok, resbody }) => {
      if (!ok) {
        throw new Error(resbody.error);
      }
      return resbody;
    });
};

/**
  Make a DELETE request with fetch
**/
export const del = (url, query) => {
  const urlWithQuery = url + "?" + new URLSearchParams(query);
  return fetch(urlWithQuery, {
    method: "DELETE",
    headers: getHeaders()
  })
    .then(response =>
      response.json().then(resbody => ({ ok: response.ok, resbody }))
    )
    .then(({ ok, resbody }) => {
      if (!ok) {
        throw new Error(resbody.error);
      }
      return resbody;
    });
};

/**
  Returns headers for a JSON fetch request with an Authorization
  header with JWT token if it is set in localStorage.
**/
const getHeaders = () => {
  const headers = {
    "Content-Type": "application/json"
  };
  const jwt = getJwt();
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }
  return headers;
};

/**
  Reads the JWT from localStorage
**/
const getJwt = () => {
  const data = localStorage.getItem("rag-auth");
  if (data) {
    return JSON.parse(data).jwt;
  }
  return null;
};

/**
  Adds name and slug to the resource payload. Only used for create.
**/
export const addNameAndSlug = (resSettings, payload) => {
  if (resSettings.handler === "json") {
    if (resSettings.slug) {
      payload.data.slug = makeSlug(payload.data[resSettings.slug]);
      payload.data.name = payload.data.slug + ".json";
    } else {
      params.data.slug = "data";
      params.data.name = "data.json";
    }
  } else if (!payload.data.name || !payload.data.slug) {
    throw "Uploaded resource data does not have name or slug";
  }
};

/**
  Changes any rawFile file and image uploads (single or multiple)
  into objects with a base64 string and file info to be used on the server.
  These will be added to the GitHub repo and a path will be inserted
  into the file.
**/
export const convertNewFiles = async (
  settings,
  resSettings,
  resource,
  payload
) => {
  // Find the path where we upload the embedded files
  const filesPath = template(resSettings.filesPath ?? settings.filesPath, {
    resource,
    slug: payload.data.slug
  });

  await changeObjects(
    payload.data,
    obj => !!obj.rawFile,
    async file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            type: "file",
            name: makeSlug(file.rawFile.path),
            path: filesPath,
            content: reader.result.split(",")[1]
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file.rawFile);
      })
  );

  return payload;
};

/**
  Takes a string and replaces every [key] with value from obj
**/
const template = (org, obj) => {
  let str = org;
  for (const key in obj) {
    str = str.replaceAll(`[${key}]`, obj[key]);
  }
  return str;
};

/**
  Turns a string into something that can be used in a filename
**/
const makeSlug = str => slugify(str, { lower: true, trim: true });
