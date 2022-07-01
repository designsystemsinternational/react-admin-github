const jwt = require("jwt-simple");
const bcrypt = require("bcrypt");
const { Octokit } = require("octokit");

const errorResponse = {
  statusCode: 401,
  authenticated: false
};

const authenticate = async (
  username,
  password,
  repo,
  folder,
  token,
  secret
) => {
  // Load JSON file from GitHub
  const octokit = new Octokit({ auth: token });
  const { data, status } = await octokit.request(
    `GET /repos/${repo}/contents/${folder}/${username}.json`
  );

  // Check that the file exists
  if (status !== 200) {
    return errorResponse;
  }

  // Compare password
  const result = await bcrypt.compare(password, data.hash);
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
