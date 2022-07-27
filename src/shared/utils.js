/**
  Allows you to iterate through an object and change every nested
  object with a replace function that passes a check function.
**/
const changeObjects = async (obj, check, replace) => {
  for (const key in obj) {
    const property = obj[key];

    // Object
    if (isObject(property)) {
      if (check(property)) {
        obj[key] = await replace(property);
      } else {
        await changeObjects(property, check, replace);
      }
    }
    // Array - does not work on nested arrays
    else if (Array.isArray(property)) {
      for (let i = 0; i < property.length; i++) {
        if (isObject(property[i])) {
          if (check(property[i])) {
            property[i] = await replace(property[i]);
          } else {
            await changeObjects(property[i], check, replace);
          }
        }
      }
    }
  }
};

const isObject = obj =>
  typeof obj === "object" && !Array.isArray(obj) && obj !== null;

/**
  Returns a timestamp string in the form of `yyyy-mm-dd-hh-mm-ss`
**/
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
 Parses a filename with name, ext and createdAt if it's in the filename
**/
const parseFilename = filename => {
  const extensionSplit = filename.split(".");
  const slugSplit = extensionSplit[0].split("-");

  const fileInfo = {
    name: filename,
    ext: extensionSplit[1],
    slug: extensionSplit[0]
  };

  // If there is a timestamp
  if (
    slugSplit.length >= 7 &&
    slugSplit[0].length === 4 &&
    slugSplit[0].startsWith("20")
  ) {
    const [year, month, day, hour, minute, second, ...slugArray] = slugSplit;
    fileInfo.createdAt = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    fileInfo.slug = slugArray.join("-");
  }

  return fileInfo;
};

module.exports = {
  changeObjects,
  timestamp,
  parseFilename
};
