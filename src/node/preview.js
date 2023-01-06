const jwtSimple = require("jwt-simple");
const { error } = require("./utils");
const { getRawFile } = require("./utils");

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

  const { data } = await getRawFile({
    token,
    repo,
    path
  });

  return {
    statusCode: 200,
    isBase64Encoded: true,
    body: data.content,
    headers: {
      "Content-Type": data.mimeType
    }
  };
};

module.exports = preview;
