const jwtSimple = require("jwt-simple");
const { Octokit } = require("octokit");
const mime = require("mime-types");
const { error } = require("./utils");

const preview = async props => {
  const { httpQuery, repo, token, secret } = props;
  const { path, previewToken } = httpQuery;

  try {
    const jwt = jwtSimple.decode(previewToken, secret);
    if (!jwt || jwt.path !== path) {
      return error(404, "Access denied");
    }
  } catch (e) {
    return error(401, "Error decoding JWT");
  }

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
