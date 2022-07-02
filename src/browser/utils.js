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
  const data = localStorage.getItem("auth");
  if (data) {
    const auth = JSON.parse(localStorage.getItem("auth"));
    return auth.jwt;
  }
  return null;
};
