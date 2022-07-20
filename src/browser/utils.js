/**
  Make a url.com?with=query&params=yeah
**/
const urlWithQuery = (url, query) => url + "?" + new URLSearchParams(query);

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

export const hasSettings = (settings, resource) =>
  typeof settings === "object" &&
  typeof settings.resources === "object" &&
  settings.resources.hasOwnProperty(resource);

/**
  Add handler to the payload
**/
export const addHandler = (settings, resource, payload) => {
  if (hasSettings(settings, resource)) {
    const settingsRes = settings.resources[resource];
    if (settingsRes.handler) {
      payload.handler = settingsRes.handler;
    } else {
      payload.handler = "file";
    }
  }
};

/**
  Add name to the payload if it's a json handler
  If slug is set: use that attribute
  If not set: name it data.json
  All names will be timestamped and slugified on the server
**/
export const addName = (settings, resource, payload) => {
  if (
    !payload.data.name &&
    hasSettings(settings, resource) &&
    settings.resources[resource].handler === "json"
  ) {
    const settingsRes = settings.resources[resource];
    if (settingsRes.slug) {
      payload.data.name = payload.data[settingsRes.slug] + ".json";
    } else {
      params.data.name = "data.json";
    }
  }
};

const rawFileToBase64File = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        type: "file",
        name: file.path,
        content: reader.result.split(",")[1]
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
  Changes any rawFile file and image uploads (single or multiple)
  into objects with a base64 string and file info to be used on the server.
  These will be added to the GitHub repo and a path will be inserted
  into the file.
**/
export const addFilesAndImages = (settings, resource, payload) => {
  const promises = [];

  for (const key in payload.data) {
    const value = payload.data[key];

    // Handle array of files
    if (
      Array.isArray(value) &&
      typeof value[0] === "object" &&
      value[0].rawFile
    ) {
      promises.push(
        Promise.all(
          value.map(file => {
            return rawFileToBase64File(file.rawFile);
          })
        ).then(files => {
          payload.data[key] = files;
        })
      );
    }
    // Handle single file
    else if (typeof value === "object" && value.rawFile) {
      promises.push(
        rawFileToBase64File(value.rawFile).then(file => {
          payload.data[key] = file;
        })
      );
    }
  }

  // Wait for all the files to have base64'd and then return new payload
  return Promise.all(promises).then(() => {
    return payload;
  });
};
