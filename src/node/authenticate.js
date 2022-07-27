const jwtSimple = require("jwt-simple");
const bcrypt = require("bcryptjs");
const { Octokit } = require("@octokit/core");
const { Base64 } = require("js-base64");
const { success, error } = require("./utils");

const authenticate = async props => {
  const { httpBody, repo, token, secret } = props;
  const { username, password } = httpBody;
  const id = `${username}.json`;

  const octokit = new Octokit({ auth: token });

  let response;
  try {
    response = await octokit.request(
      `GET /repos/${repo}/contents/content/users/${id}`
    );
  } catch (e) {
    return error(e.status, e.message);
  }

  const { data, status } = response;

  // Check that the file exists
  if (status !== 200 || !data.content) {
    return error(500, "Could not load JSON from users folder");
  }

  const json = JSON.parse(Base64.decode(data.content));

  if (!json.hash) {
    return error(500, "User JSON does not have password hash");
  }

  // Compare password
  const result = await bcrypt.compare(password, json.hash);
  if (!result) {
    return error(404, "Wrong username or password");
  }

  // Create JWT
  const jwt = jwtSimple.encode({ id }, secret);

  // Return object
  return success(
    200,
    Object.assign({}, json, {
      id,
      jwt,
      authenticated: true
    })
  );
};

module.exports = authenticate;
