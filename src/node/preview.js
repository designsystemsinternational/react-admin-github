const jwtSimple = require("jwt-simple");
const { Octokit } = require("@octokit/rest");
const { error } = require("./utils");
const fetch = require("node-fetch-commonjs");
const FileType = require("file-type");

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

  // This seems to be good enough as github will convert slashes in the repo
  // name to dashes, so splitting on slash to get the owner and repo name
  // should work.
  const octokit = new Octokit({ auth: token });
  const authToken = await octokit.auth();
  const owner = repo.split("/")[0];
  const repository = repo.split("/")[1];

  // When working with files potentially bigger than 1 MB we need to request
  // them in RAW mode. However octokit "mangles" the raw data into UTF-8 leaving
  // us with no chance to reconstruct the binary data we need from it.
  //
  // Following the approach suggested in this issue (https://github.com/octokit/rest.js/issues/14)
  // we use octokit to get the request URL and then do the request ourselves
  // using node-fetch.
  const requestOptions = octokit.repos.getContent.endpoint({
    owner,
    repo: repository,
    path,
    mediaType: {
      format: "raw"
    }
  });

  // Perform the request using node-fetch, using the URL and token we generated
  // with octokit before.
  const resp = await fetch(requestOptions.url, {
    method: "GET",
    headers: {
      Authorization: `token ${authToken.token}`,
      ...requestOptions.headers
    }
  });

  // Turning everything into a binary buffer
  const buffer = await resp.buffer();

  // Using file-type to get the correct mime type by reading the buffer's
  // magic number (usually within the first few bytes of the file).
  const mimeType = await FileType.fromBuffer(buffer);

  return {
    statusCode: 200,
    isBase64Encoded: true,
    body: buffer.toString("base64"),
    headers: {
      "Content-Type": mimeType.mime
    }
  };
};

module.exports = preview;
