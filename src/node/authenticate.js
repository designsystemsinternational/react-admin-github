const jwt = require("jwt-simple");
const bcrypt = require("bcrypt");
const { Octokit } = require("octokit");
const { Base64 } = require("js-base64");

const errorResponse = {
  statusCode: 401,
  authenticated: false
};

const authenticate = async ({
  username,
  password,
  repo,
  usersFolder,
  token,
  secret
}) => {
  // Load JSON file from GitHub
  const octokit = new Octokit({ auth: token });
  const { data, status } = await octokit.request(
    `GET /repos/${repo}/contents/${usersFolder}/${username}.json`
  );

  // Check that the file exists
  if (status !== 200 || !data.content) {
    return errorResponse;
  }

  const json = JSON.parse(Base64.decode(data.content));

  if (!json.hash) {
    return errorResponse;
  }

  console.log("secret is", secret);
  console.log("token is", token);

  // Compare password
  const result = await bcrypt.compare(password, json.hash);
  if (result) {
    const tokenPayload = { username };
    const token = jwt.encode(tokenPayload, secret);
    return Object.assign({}, json, {
      statusCode: 200,
      authenticated: true,
      token
    });
  } else {
    return errorResponse;
  }
};

module.exports = authenticate;
