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
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        throw new Error(data.error);
      }
      return data;
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
  }).then(response => response.json());
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

const getJwt = () => {
  const data = localStorage.getItem("auth");
  if (data) {
    const auth = JSON.parse(localStorage.getItem("auth"));
    return auth.jwt;
  }
  return null;
};

const buildAuthProvider = authenticateUrl => {
  return {
    login: ({ username, password }) => {
      return post(authenticateUrl, { username, password }).then(data => {
        if (data.authenticated) {
          localStorage.setItem("auth", JSON.stringify(data));
          return Promise.resolve();
        } else {
          return Promise.reject();
        }
      });
    },
    checkError: error => {
      const status = error.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("auth");
        return Promise.reject();
      }
      return Promise.resolve();
    },
    checkAuth: params => {
      if (localStorage.getItem("auth")) {
        return Promise.resolve();
      } else {
        return Promise.reject();
      }
    },
    logout: () => {
      localStorage.removeItem("auth");
      return Promise.resolve();
    },
    getIdentity: () => {
      try {
        const { id, fullName, avatar } = JSON.parse(
          localStorage.getItem("auth")
        );
        return Promise.resolve({ id, fullName, avatar });
      } catch (error) {
        return Promise.reject(error);
      }
    },
    getPermissions: () => Promise.resolve("")
  };
};

const buildJsonDataProvider = proxyUrl => {
  return {
    getList: (resource, params) => {
      return get(proxyUrl, {
        resource,
        sort: JSON.stringify(params.sort),
        pagination: JSON.stringify(params.pagination),
        filter: JSON.stringify(params.filter)
      }).then(data => {
        console.log("data", data);
        return data;
      });
    },
    getOne: (resource, params) => {
      return get(proxyUrl, {
        resource: resource,
        id: params.id
      }).then(data => {
        console.log("data", data);
        return data;
      });
    }
  };
};

export { buildAuthProvider, buildJsonDataProvider };
