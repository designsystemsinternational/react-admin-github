const { join, basename, relative, dirname, resolve } = require("path");
const { Base64 } = require("js-base64");
const jwtSimple = require("jwt-simple");

/**
  Simple utils
**/
const base64ToJson = base64 => JSON.parse(Base64.decode(base64));
const jsonToBase64 = json => Base64.encode(JSON.stringify(json, null, 2));
const error = (statusCode, error) => ({ statusCode, body: { error } });
const success = (statusCode, body) => ({ statusCode, body });

/**
  Called before saving the data to the repo.
  The most important function is to remove auto-generated properties.
**/
const beforeSave = async (octokit, repo, data, handler, jsonPath) => {
  const copy = Object.assign({}, data);

  // If JSON, handle files including newly uploaded files
  if (handler === "json") {
    await iterateFiles(copy, async orgFile => {
      const file = Object.assign({}, orgFile);

      // This is a new file
      if (file.content) {
        const fullName = `${timestamp()}-${file.name}`;
        const fullPath = join("content", file.path, fullName);
        await uploadFile(octokit, repo, fullPath, file.content);
        delete file.content;
        file.src = relativePath(jsonPath, fullPath);
      }

      // Delete file properties
      delete file.url;
      delete file.name;
      delete file.path;

      return file;
    });
  }

  // Remove generate main properties
  delete copy.id;
  delete copy.name;
  delete copy.path;
  delete copy.type;
  delete copy.createdAt;
  delete copy.slug;

  return copy;
};

/**
  Called before returning the data to the data provider
  The most important function is to create auto-generated properties.
**/
const beforeResponse = async (githubFile, handler, url, secret, json) => {
  const payload = {
    id: githubFile.name,
    name: githubFile.name,
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
    payload.createdAt = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    payload.slug = slugArray.join("-");
  } else {
    payload.slug = withoutExt;
  }

  // Check if we should add JSON contents to payload
  if (
    handler === "json" &&
    (json || githubFile.content) &&
    githubFile.name.endsWith(".json")
  ) {
    const contents = json ?? base64ToJson(githubFile.content);

    // Add URL property to all single files or array of files
    await iterateFiles(contents, file => {
      const filePath = absolutePath(payload.path, file.src);
      const jwt = jwtSimple.encode({ path: filePath }, secret);
      const fileUrl =
        url + `?handler=preview&path=${filePath}&previewToken=${jwt}`;
      return Object.assign({}, file, {
        url: fileUrl,
        name: basename(filePath)
      });
    });

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

/**
  Allows you to iterate through all files (single and array) in a dataset
  and replace the file object with whatever is returned in a callback
**/
const iterateFiles = async (data, cb) => {
  for (const key in data) {
    const value = data[key];

    // Array of files
    if (Array.isArray(value) && value[0].type === "file") {
      const replacements = [];
      for (let i = 0; i < value.length; i++) {
        const replace = await cb(value[i]);
        replacements.push(replace);
      }
      data[key] = replacements;
    }
    // Single file
    else if (typeof value === "object" && value.type === "file") {
      data[key] = await cb(value);
    }
  }
};

module.exports = {
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
