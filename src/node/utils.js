const { join, basename, relative, dirname, resolve, extname } = require("path");
const { Base64 } = require("js-base64");
const jwtSimple = require("jwt-simple");
const { changeObjects, parseFilename } = require("../shared/utils");
const bcrypt = require("bcryptjs");
const fetch = require("node-fetch-commonjs");
const FileType = require("file-type");

/**
  Simple utils
**/
const base64ToJson = base64 => JSON.parse(Base64.decode(base64));
const jsonToBase64 = json => Base64.encode(JSON.stringify(json, null, 2));
const error = (statusCode, error) => ({ statusCode, body: { error } });
const success = (statusCode, body) => ({ statusCode, body });

/**
  Authorizes a user
**/
const isAuthorized = (httpHeaders, secret) => {
  const authHeader =
    httpHeaders["Authorization"] ?? httpHeaders["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return false;
  }

  try {
    const jwt = authHeader.substring(7, authHeader.length);
    const user = jwtSimple.decode(jwt, secret);
    if (user.id) {
      return true;
    }
  } catch (e) {}

  return false;
};

/**
  Called before saving the data to the repo.
  The most important function is to remove auto-generated properties.
**/
const beforeSave = async (octokit, repo, resource, data, handler, jsonPath) => {
  // Remove generated main properties
  delete data.id;
  delete data._ragInfo;

  if (handler === "json") {
    // Handle user passwords
    if (resource === "users") {
      if (data.password) {
        data.hash = hashPassword(data.password);
      }
      delete data.password;
    }

    // Handle newly uploaded files
    await changeObjects(
      data,
      obj => obj.type === "file",
      async orgFile => {
        const file = Object.assign({}, orgFile);

        // This is a new file
        if (file.content) {
          const fullPath = join("content", file.path, file.id);
          await uploadFile(octokit, repo, fullPath, file.content);
          delete file.content;
          file.src = relativePath(jsonPath, fullPath);
        }

        // Delete file properties
        delete file.id;
        delete file.url;
        delete file.path;

        return file;
      }
    );
  }
};

/**
  Called before returning the data to the data provider
  The most important function is to create auto-generated _ragInfo and id properties.
**/
const beforeResponse = async (githubFile, handler, url, secret, json) => {
  const parsedFilename = parseFilename(githubFile.name);

  const payload = {
    id: githubFile.name,
    _ragInfo: {
      name: githubFile.name,
      path: githubFile.path,
      type: githubFile.type,
      slug: parsedFilename.slug,
      ext: parsedFilename.ext
    }
  };

  // Check if filename has timestamp

  if (parsedFilename.createdAt) {
    payload._ragInfo.createdAt = parsedFilename.createdAt;
  }

  // Check if we should add JSON contents to payload
  if (
    handler === "json" &&
    (json || githubFile.content) &&
    githubFile.name.endsWith(".json")
  ) {
    const contents = json ?? base64ToJson(githubFile.content);

    // Add URL property to all single files or array of files
    await changeObjects(
      contents,
      obj => {
        return obj.type === "file";
      },
      file => {
        const filePath = absolutePath(payload._ragInfo.path, file.src);
        const jwt = jwtSimple.encode({ path: filePath }, secret);
        const fileUrl =
          url + `?handler=preview&path=${filePath}&previewToken=${jwt}`;
        return Object.assign({}, file, {
          id: basename(filePath),
          url: fileUrl
        });
      }
    );

    Object.assign(payload, contents, { id: payload.id });
  }

  return payload;
};

/**
  Parses a JSON string into an object
  Passes everything straight through
**/
const maybeParseJson = str => {
  if (typeof str === "string" && str !== "") {
    return JSON.parse(str);
  }
  return str;
};

/**
  Finds the relative path from a file to a file.
  Helpful for adding links to images in a from JSON to a to image
**/
const relativePath = (from, to) => {
  return join(relative(dirname(from), dirname(to)), basename(to));
};

/**
  Turns a relative path into an absolute path based on an origin path
  The originFile path cannot have a starting slash and should have an ext
**/
const absolutePath = (originFile, relative) => {
  return resolve(`/${dirname(originFile)}`, relative).substring(1);
};

/**
  Creates or updates a file by path
**/
const uploadFile = async (octokit, repo, path, content) => {
  const response = await octokit.request(
    `PUT /repos/${repo}/contents/${path}`,
    {
      message: `Added file: ${path}`,
      content
    }
  );
  return response;
};

/**
  This is a simple function that can be used to generate the first user
  in the users folder.
**/

const hashPassword = (password, saltRounds = 10) => {
  return bcrypt.hashSync(password, saltRounds);
};

const logUserInfo = (email, password, saltRounds) => {
  const hash = hashPassword(password, saltRounds);
  console.log(`Password hashed!`);
  console.log(
    `Now create a file named content/users/${email}.json with the following JSON content:`
  );
  console.log(
    JSON.stringify(
      {
        hash,
        fullName: "Your full name",
        avatar: "https://link.to.your.profile.image"
      },
      null,
      2
    )
  );
};

/**
  Retrieves owner and repo name from a URL-like string.
  Turning `owner/repo` into `{ owner: 'owner', repository: 'repo' }`
**/
const parseRepo = repo => {
  const [owner, repoName] = repo.split("/");
  return { owner, repository: repoName };
};

/**
  Gets data from Github using the raw media type. This allows us to get around the APIs
  default size limit of 1MB.

  Returns a base64 encoded buffer
 **/
const getRawFile = async ({ token, octokitRest, repo, path }) => {
  const { owner, repository } = parseRepo(repo);

  const request = octokitRest.repos.getContent.endpoint({
    owner,
    repo: repository,
    path,
    mediaType: {
      format: "raw"
    }
  });

  const response = await fetch(request.url, {
    method: "GET",
    headers: {
      Authorization: `token ${token}`,
      ...request.headers
    }
  });

  const buffer = await response.buffer();
  const mimeType = await FileType.fromBuffer(buffer);
  return {
    data: {
      name: basename(path),
      path,
      type: "file",
      mimeType,
      content: buffer.toString("base64")
    }
  };
};

module.exports = {
  isAuthorized,
  base64ToJson,
  jsonToBase64,
  error,
  success,
  maybeParseJson,
  beforeResponse,
  beforeSave,
  uploadFile,
  hashPassword,
  logUserInfo,
  parseRepo,
  getRawFile
};
