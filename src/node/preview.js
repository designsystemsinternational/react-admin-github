const jwtSimple = require("jwt-simple");
const { Octokit } = require("octokit");
const mime = require("mime-types");

const preview = async props => {
  const { httpQuery, repo, token, secret } = props;
  const { path } = httpQuery;

  // Check that the JWT is for this file and is still valid

  // Proxy file down to the client
  const octokit = new Octokit({ auth: token });
  const response = await octokit.request(`GET /repos/${repo}/contents/${path}`);
  return {
    statusCode: 200,
    isBase64Encoded: true,
    body: response.data.content,
    headers: {
      "Content-Type": mime.contentType(response.data.name)
    }
  };
};

module.exports = preview;
