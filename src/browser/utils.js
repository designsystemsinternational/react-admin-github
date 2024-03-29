import slugify from "slugify";
import getNestedObjectProperty from "lodash.get";

import { changeObjects, timestamp, parseFilename } from "../shared/utils";

/**
  Defaults
**/

const defaultSettings = {
  // The default upload location for files in JSON data
  // Example: `content/posts/2022-01-01-12-00-00-post-title.json`
  // Files are stored in: `content/posts/post-title`
  uploadJsonFilesTo: (resource, data) => {
    const info = parseFilename(data.id);
    return `${resource}/${info.slug}`;
  }
};

const getDefaultResourceSettings = resource => {
  if (resource === "users") {
    return {
      handler: "json",
      filenameFromProperty: "email",
      disableTimestamp: true
    };
  }
  if (resource === "releases") {
    return {
      handler: "releases"
    };
  } else {
    return {
      handler: "file"
    };
  }
};

export const getSettings = settings => {
  if (settings) {
    return Object.assign({}, defaultSettings, settings);
  }
  return defaultSettings;
};

export const getResourceSettings = (settings, resource) => {
  const defaultResourceSettings = getDefaultResourceSettings(resource);
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
  const uploadJsonFilesToFunc =
    resSettings.uploadJsonFilesTo ?? settings.uploadJsonFilesTo;
  const uploadJsonFilesTo = uploadJsonFilesToFunc(resource, payload.data);

  await changeObjects(
    payload.data,
    obj => !!obj.rawFile,
    async file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            type: "file",
            id: createFilename(file.rawFile.path, false, true),
            path: uploadJsonFilesTo,
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
 Resolves the filenameFromProperty value for a resource, either by looking up
 the value or by running the passed function to generate the value
**/
export const resolveFilenameFromProperty = (
  filenameFromProperty,
  data,
  fallback = "untitled"
) => {
  if (typeof filenameFromProperty === "function") {
    return filenameFromProperty.call(null, data) || fallback;
  }

  return getNestedObjectProperty(data, filenameFromProperty) || fallback;
};

/**
  Adds id to the payload with the name of the new file to be created. Only used for create.
**/
export const createId = (resSettings, payload) => {
  const { handler, filenameFromProperty, disableTimestamp } = resSettings;

  if (handler === "json") {
    if (!payload.data.hasOwnProperty("id")) {
      if (filenameFromProperty) {
        payload.data.id =
          createFilename(
            resolveFilenameFromProperty(filenameFromProperty, payload.data),
            disableTimestamp
          ) + ".json";
      } else {
        payload.data.id = createFilename("data.json", disableTimestamp);
      }
    } else {
      payload.data.id = createFilename(payload.data.id, disableTimestamp);
      if (!payload.data.id.endsWith(".json")) {
        payload.data.id += ".json";
      }
    }
  }
  // For handlers other than JSON, you have to submit the ID!
  else if (
    resSettings.handler === "file" &&
    !payload.data.hasOwnProperty("id")
  ) {
    throw "Uploaded resource data does not have id";
  }
};

/**
 * Returns a random string of a given length.
 */
const randomString = (length = 5) => {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return Array.from({ length })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join("");
};

/**
  Turns a string into something that can be used in a filename
**/
export const createFilename = (str, disableTimestamp, useRandomPrefix) => {
  const slugified = slugify(str, {
    lower: true,
    trim: true,
    remove: /[*+~\[\]{}()¿?'"¡!:@]/g
  });

  const filename = disableTimestamp ? slugified : timestamp() + "-" + slugified;

  return useRandomPrefix ? randomString() + "-" + filename : filename;
};
