const bcrypt = require("bcryptjs");

/**
  This is a simple function that can be used to generate the first user
  in the users folder.
**/

module.exports = (email, password, saltRounds = 10) => {
  const hash = bcrypt.hashSync(password, saltRounds);
  console.log(`Password hashed!`);
  console.log(
    `Now create a file named content/users/${email}.json with the following JSON content:`
  );
  console.log(
    JSON.stringify(
      {
        fullName: "Your full name",
        id: email,
        hash,
        avatar: "https://link.to.your.profile.image"
      },
      null,
      2
    )
  );
};
