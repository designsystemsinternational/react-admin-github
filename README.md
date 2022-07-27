# React Admin GitHub

The goal of this package is to enable GitHub as an authentication and data provider to websites using [`react-admin`](https://marmelab.com/react-admin/). We often have the need for providing a simple editing interface on top of a Git repository, and this package is trying to solve that need. Given that the GitHub API is a bit different than an API backed by a traditional database, this package has a number of limitations:

- **A limit of 1000 entries for a single resource**. This is because neither the Git Tree nor the Git Content API supports pagination on file data, and those endpoints return up to 1000 items.
- **Limited data on lists**. When working with JSON files, we store the content of each resource item in a JSON file. We cannot load every file when listing resources, so we can only show basic fileinfo on lists.
- **1MB filesize**. The GitHub Contents API only allows loading of files up to 1MB. This is most apparent when using the `ImageField` to preview uploaded images. Since large uploads are allowed, this package will show a fallback images when trying to preview images larger than 1MB.

You can see a working example with `react-admin`, `react-admin-github` and `gatsby` here:
https://github.com/designsystemsinternational/react-admin-github-example

This package ships with three main pieces of functionality:

## Auth Provider

The `authProvider` uses a list of JSON files with user data from the GitHub repository to handle authentication and user management. You can create, edit or delete these JSON files, and this will determine whether users can log in to your `react-admin` website.

The `authProvider` **does not** use the GitHub OAuth flow as a login to your `react-admin` site, as we don't want to require our `react-admin` users to create GitHub accounts.

The list of user files should be created in a [`content/users` folder](https://github.com/designsystemsinternational/react-admin-github-example/tree/main/content/users) in the website repository root, and this file has basic info about the user, as well as a hashed password.

### Seeding with the first user

There is an accompanying function to generate the file contents for the first user, since you won't be able to log in unless the `content/users` folder is empty. This is how you use it from the Node repl:

```
$ node
> const hash = require("@designsystemsinternational/react-admin-github/src/node/hash");
> hash('my@email.com', 'mypassword');
Password hashed!
Now create a file named content/users/rune@runemadsen.com.json with the following JSON content:
{
  "fullName": "Your full name",
  "id": "my@email.com",
  "hash": "$2a$10$SZwAAxUXuvrQQP2SCPMmRum4plAjH/SoqxtVLjz48cd4.Qz9eDbba",
  "avatar": "https://link.to.your.profile.image"
}
```

## Data Provider

The `dataProvider` is used to load both normal files and resource data stored in JSON files in a folder named after the resource (e.g. [`content/posts`](https://github.com/designsystemsinternational/react-admin-github-example/tree/main/content/posts)). It uses the GitHub contents API to load, create, update and delete these files.

> TODO: File handler
> TODO: JSON handler
> TODO: File uploads: How they are handled.
> TODO: File upload path settings and template strings
> TODO: Cannot have id in JSON
> TODO: Releases. AUTO-ENABLED BY NAME
> TODO: Releases will auto-load workflow runs too on getList
> TODO: uploadJsonFilesTo function (resource, data)
> TODO: \_ragInfo

## API function

When communicating with the GitHub API, you need a personal access token or App secret, and these cannot be exposed on your static website. Therefore, this package ships with a single function that can be used in any serverless framework (AWS Lambda, Netlify Functions, etc) or cloud server (EC2, Heroku, etc) to proxy calls to the GitHub API. This function holds all the functionality needed to run the `authProvider` and `dataProvider`.

> TODO: base64!
> TODO: Must accept all HTTP methods

## Example

This example demonstrates how to use this package:
https://github.com/designsystemsinternational/react-admin-github-example
