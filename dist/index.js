/**
  Make a url.com?with=query&params=yeah
**/

/**
  Make a GET request with fetch
  Returns a promise that:
  - on success: resolves with the data
  - on error: rejects with the data.error message
**/
const get = (url, query) => {
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
const post = (url, body) => {
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
const put = (url, body) => {
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
const del = (url, query) => {
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
  Used for adding extra stuff to the query or body of a request
  based on the settings that the dataprovider was provided.
**/
const addSettingsToPayload = (settings, resource, payload) => {
  // Add settings specific to the resource
  if (settings && settings.resources && settings.resources[resource]) {
    const resourceSettings = settings.resources[resource];

    // smartJson
    if (resourceSettings.loadJson) {
      payload.loadJson = "true";
    }
  }
};

const buildAuthProvider = authenticateUrl => {
  return {
    login: ({ username, password }) => {
      return post(authenticateUrl, {
        action: "authenticate",
        id: username,
        password
      }).then(data => {
        if (data.authenticated) {
          localStorage.setItem("rag-auth", JSON.stringify(data));
          return Promise.resolve();
        } else {
          return Promise.reject();
        }
      });
    },
    checkError: error => {
      const status = error.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("rag-auth");
        return Promise.reject();
      }
      return Promise.resolve();
    },
    checkAuth: params => {
      if (localStorage.getItem("rag-auth")) {
        return Promise.resolve();
      } else {
        return Promise.reject();
      }
    },
    logout: () => {
      localStorage.removeItem("rag-auth");
      return Promise.resolve();
    },
    getIdentity: () => {
      try {
        const { id, fullName, avatar } = JSON.parse(
          localStorage.getItem("rag-auth")
        );
        return Promise.resolve({ id, fullName, avatar });
      } catch (error) {
        return Promise.reject(error);
      }
    },
    getPermissions: () => Promise.resolve("")
  };
};

const buildDataProvider = (proxyUrl, settings) => {

  return {
    /**
      Get a list of resources.
    **/
    getList: (resource, params) => {
      const { pagination, sort } = params;

      const query = {
        action: "contents",
        resource,
        page: pagination.page,
        perPage: pagination.perPage,
        sortField: sort.field,
        sortOrder: sort.order
      };

      addSettingsToPayload(settings, resource, query);

      return get(proxyUrl, query);
    },

    /**
      Get a single resource
    **/
    getOne: (resource, params) => {
      const query = {
        action: "contents",
        resource: resource,
        id: params.id
      };

      addSettingsToPayload(settings, resource, query);

      return get(proxyUrl, query);
    },

    getMany: (resource, params) => {
      return get(proxyUrl, {
        action: "contents",
        resource: resource,
        ids: JSON.stringify(params.ids)
      });
    },
    // getManyReference

    /**
      Create a resource
    **/
    create: (resource, params) => {
      return put(proxyUrl, {
        action: "contents",
        resource: resource,
        data: params.data
      });
    },

    /**
      Update a resource
    **/
    update: (resource, params) => {
      const body = {
        action: "contents",
        resource: resource,
        data: params.data
      };

      addSettingsToPayload(settings, resource, body);

      return put(proxyUrl, body);
    },

    // updateMany

    /**
      Delete a resource
    **/
    delete: (resource, params) => {
      const query = {
        action: "contents",
        resource: resource,
        id: params.id
      };

      addSettingsToPayload(settings, resource, query);

      return del(proxyUrl, query);
    }

    // deleteMany
  };
};

export { buildAuthProvider, buildDataProvider };
