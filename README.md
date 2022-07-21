# React Admin GitHub

The goal of this package is to enable GitHub as an auth and data provider to websites created with [`react-admin`](https://marmelab.com/react-admin/). We often have the need for providing a simple editing interface on top of Git repository files and this package is the result of that. Please read the documentation below as the GitHub API has several limitations that influence what you can do in your `react-admin` site.

You can see a working example with `react-admin`, `react-admin-github` and `gatsby` here:
https://github.com/designsystemsinternational/react-admin-github-example

## How does it work?

This package ships with three main pieces of functionality:

### 1. Auth Provider

The `authProvider` uses a list of JSON files with user data from the GitHub repository to handle authentication and user management. You can create, edit or delete these JSON files, and this will determine whether users can log in to your `react-admin` website.

The `authProvider` **does not** use the GitHub OAuth flow as a login to your `react-admin` site, as we don't want to require our `react-admin` users to create GitHub accounts.

The list of user files should be created in a [`content/users` folder](https://github.com/designsystemsinternational/react-admin-github-example/tree/main/content/users) in the website repository root, and this file has basic info about the user, as well as a hashed password.

### 2. Data Provider

The `dataProvider` is used to load both normal files and resource data stored in JSON files in a folder named after the resource (e.g. [`content/posts`](https://github.com/designsystemsinternational/react-admin-github-example/tree/main/content/posts)). It uses the GitHub contents API to load, create, update and delete these JSON files, and this puts a number of restrictions on this package:

- **You can have a maximum of 1000 resources in the same resource folder**. This is because neither the Git Tree nor the Git Content API on GitHub supports pagination on file data.
- **You can only show a single field value and a `createdAt` timestamp in the resource list**. This is because we cannot load all resource JSON files via the GitHub API when listing resources, so this package encodes a timestamp and a field value into the filename itself (e.g. `2022-07-05-09-00-00-My-amazing-post.json`). You can set which field value to use when setting up the API functions (see below).

> TODO: File uploads: How they are handled.

### 3. API function

When communicating with the GitHub API, you need a personal access token or App secret, and these cannot be exposed on your static website. Therefore, this package ships with a single function that can be used in any serverless framework (AWS Lambda, Netlify Functions, etc) or cloud server (EC2, Heroku, etc) to proxy calls to the GitHub API. This function holds all the functionality needed to run the `authProvider` and `dataProvider`.

> TODO: base64!

## Example

This example demonstrates how to use this package:
https://github.com/designsystemsinternational/react-admin-github-example
