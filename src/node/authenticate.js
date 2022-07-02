const jwtSimple = require("jwt-simple");
const bcrypt = require("bcrypt");
const { Octokit } = require("octokit");
const { Base64 } = require("js-base64");

const authenticate = async ({ id, password, repo, token, secret }) => {
  // Load JSON file from GitHub
  const octokit = new Octokit({ auth: token });
  const { data, status } = await octokit.request(
    `GET /repos/${repo}/contents/content/users/${id}.json`
  );

  // Check that the file exists
  if (status !== 200 || !data.content) {
    throw new Error(`Could not load JSON from users folder`);
  }

  const json = JSON.parse(Base64.decode(data.content));

  if (!json.hash) {
    throw new Error(`User JSON does not have password hash`);
  }

  // Compare password
  const result = await bcrypt.compare(password, json.hash);
  if (!result) {
    throw new Error(`Wrong password`);
  }

  // Create JWT
  const jwtPayload = { id };
  const jwt = jwtSimple.encode(jwtPayload, secret);

  // Return object
  return Object.assign({}, json, {
    id,
    jwt,
    authenticated: true
  });
};

module.exports = authenticate;
