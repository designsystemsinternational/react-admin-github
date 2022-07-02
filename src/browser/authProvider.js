import { post } from "./utils";

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

export default buildAuthProvider;
