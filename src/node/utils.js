const { join, basename, relative, dirname, resolve } = require("path");
const { Base64 } = require("js-base64");
const slugify = require("slugify");
const jwtSimple = require("jwt-simple");

const withId = (data, id) => Object.assign({}, data, { id });

const base64ToJson = base64 => JSON.parse(Base64.decode(base64));
const jsonToBase64 = json => Base64.encode(JSON.stringify(json, null, 2));

const error = (statusCode, error) => ({ statusCode, body: { error } });
const success = (statusCode, body) => ({ statusCode, body });

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
  Adds a timestamp to an existing filename
**/
const createFilename = name => {
  return `${timestamp()}-${slugify(name, { lower: true, trim: true })}`;
};

/**
  These property values are never saved in JSON files, but instead
  added on the fly by the server.
**/
const removeGeneratedProperties = async data => {
  const copy = Object.assign({}, data);

  // Remove all the main properties that we generated
  const generated = ["id", "name", "path", "type", "createdAt", "slug"];
  for (let i = 0; i < generated.length; i++) {
    delete copy[generated[i]];
  }

  // Remove url field from all files
  await iterateFiles(copy, file => {
    delete file.url;
    return file;
  });

  return copy;
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

/**
  Constructs `data` payload for a single React Admin resource
   based on the response from the GitHub API.
**/
const resourcePayload = async (responseData, handler, url, secret, json) => {
  const payload = {
    id: responseData.name,
    name: responseData.name,
    path: responseData.path,
    type: responseData.type
  };

  // Check if filename has timestamp
  const nameSplit = responseData.name.split("-");
  if (nameSplit.length >= 7) {
    const [year, month, day, hour, minute, second, ...slugArray] = nameSplit;
    payload.createdAt = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    payload.slug = slugArray.join("-");
  }

  // Check if we should add JSON contents to payload
  if (
    (json || responseData.content) &&
    handler === "json" &&
    responseData.name.endsWith(".json")
  ) {
    const contents = json ?? base64ToJson(responseData.content);

    // Add URL property to all single files or array of files
    await iterateFiles(contents, file => {
      const filePath = absolutePath(payload.path, file.src);
      const jwt = jwtSimple.encode({ path: filePath }, secret);
      const fileUrl =
        url + `?handler=preview&path=${filePath}&previewToken=${jwt}`;
      return Object.assign({}, file, {
        url: fileUrl
      });
    });

    Object.assign(payload, contents);
  }

  return payload;
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
  Checks if a file is new. If so, it uploads it to the repo
  and returns a file info object.
**/
const fileToFileInfo = async (octokit, repo, file, jsonPath) => {
  // This is a new file
  if (file.content) {
    const fileName = createFilename(file.name);
    const filePath = `content/files/${fileName}`;
    await uploadFile(octokit, repo, filePath, file.content);
    return {
      type: "file",
      name: basename(filePath),
      src: relativePath(jsonPath, filePath)
    };
  }
  // This is an old file
  else {
    return file;
  }
};

/**
  Runs through the JSON payload and uploads all files with new content to the repo
  and replaces with an object with info about the file.
**/
const filesToFilesInfo = async (octokit, repo, data, jsonPath) => {
  await iterateFiles(data, async file =>
    fileToFileInfo(octokit, repo, file, jsonPath)
  );
};

/**
  Allows you to iterate through all files (single and array) in a dataset
  and replace the file object with whatever is returned in a callback
**/
const iterateFiles = async (data, cb) => {
  for (key in data) {
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
  withId,
  base64ToJson,
  jsonToBase64,
  createFilename,
  error,
  success,
  maybeParseJson,
  resourcePayload,
  removeGeneratedProperties,
  uploadFile,
  filesToFilesInfo
};
