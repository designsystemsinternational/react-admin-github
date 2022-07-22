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

module.exports = {
  changeObjects
};
