const { join, basename, relative, dirname, resolve } = require("path");
const { Base64 } = require("js-base64");
const jwtSimple = require("jwt-simple");
const { changeObjects } = require("../shared/utils");

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
const beforeSave = async (octokit, repo, data, handler, jsonPath) => {
  // If JSON, handle files including newly uploaded files
  if (handler === "json") {
    await changeObjects(
      data,
      obj => obj.type === "file",
      async orgFile => {
        const file = Object.assign({}, orgFile);

        // This is a new file
        if (file.content) {
          const fullName = `${timestamp()}-${file.id}`;
          const fullPath = join("content", file.path, fullName);
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

  // Remove generated main properties
  delete data.id;
  delete data.path;
  delete data.type;
  delete data.createdAt;
  delete data.slug;
};

/**
  Called before returning the data to the data provider
  The most important function is to create auto-generated properties.
**/
const beforeResponse = async (githubFile, handler, url, secret, json) => {
  const payload = {
    id: githubFile.name,
    path: githubFile.path,
    type: githubFile.type
  };

  // Check if filename has timestamp
  const withoutExt = githubFile.name.split(".")[0];
  if (withoutExt.length >= 7) {
    const [
      year,
      month,
      day,
      hour,
      minute,
      second,
      ...slugArray
    ] = withoutExt.split("-");
    if (!payload.hasOwnProperty("createdAt")) {
      payload.createdAt = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
    if (!payload.hasOwnProperty("slug")) {
      payload.slug = slugArray.join("-");
    }
  } else {
    if (!payload.hasOwnProperty("slug")) {
      payload.slug = withoutExt;
    }
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
        const filePath = absolutePath(payload.path, file.src);
        const jwt = jwtSimple.encode({ path: filePath }, secret);
        const fileUrl =
          url + `?handler=preview&path=${filePath}&previewToken=${jwt}`;
        return Object.assign({}, file, {
          url: fileUrl,
          id: basename(filePath)
        });
      }
    );

    Object.assign(payload, contents);
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
const relativePath = (from, to) =>
  join(relative(dirname(from), dirname(to)), basename(to));

/**
  Turns a relative path into an absolute path based on an origin path
  The originFile path cannot have a starting slash and should have an ext
**/
const absolutePath = (originFile, relative) => {
  const absolute = resolve(`/${dirname(originFile)}`, relative);
  return absolute.substring(1);
};

const timestamp = () => {
  const padTo2Digits = num => {
    return num.toString().padStart(2, "0");
  };

  const date = new Date();

  return [
    date.getUTCFullYear(),
    padTo2Digits(date.getUTCMonth() + 1),
    padTo2Digits(date.getUTCDate()),
    padTo2Digits(date.getUTCHours()),
    padTo2Digits(date.getUTCMinutes()),
    padTo2Digits(date.getUTCSeconds())
  ].join("-");
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
  timestamp
};
