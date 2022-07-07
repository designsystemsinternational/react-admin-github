# React Admin GitHub

The goal of this package is to enable GitHub as an auth and data provider to websites created with [`react-admin`](https://marmelab.com/react-admin/). We often have the need for providing a simple editing interface on top of Git repository files and this package is the result of that. Please read the documentation below as the GitHub API has several limitations that influence what you can do in your `react-admin` site.

You can see a working example with `react-admin`, `react-admin-github` and `gatsby` here:
https://github.com/designsystemsinternational/react-admin-github-example

## How does it work?

This package ships with three main pieces of functionality:

### 1. Auth Provider

This `authProvider` for `react-admin` uses a list of JSON files with user data from the GitHub repository to handle authentication and user management. You can create, edit or delete these JSON files, and this will determine whether users can log in to your `react-admin` website.

The `authProvider` **does not** use the GitHub Oauth flow as a login to your `react-admin` site, as we don't want to require our `react-admin` to create GitHub accounts.

The list of user files should be created in a `content/users` folder in the website repository root, and each user should have at least

**React Admin Data Provider**. A data provider for `react-admin` that allows you to load and save JSON files directly from the GitHub repository.

**API functions**. These allow you to create a simple API that serves as a proxy between the static site and the GitHub app. This is needed because the static site cannot expose the GitHub access token. These functions are written so they can be used in both server and serverless environments.

> TODO: Cannot have more than 1000 files in a single folder

> TODO: filenames are YYYY-MM-DD-HH-MM-SS-slug.json

## Getting Started

### Creating the API

You will need to use this package to create two API routes that can be called by the auth and data providers. The examples below show how to use the exported functions in an AWS Lambda environment, but the concept should be easily transferred to Netlify Functions or an Express.js app running on Heroku.

#### Auth API endpoint

Use the `authenticate` function to authenticate a given `username` and `password`.

> TODO: Explain how the JWT works

```js
TODO!
```

> TODO: Explain how `user/repo/folder` works! Including auto ID as filename identifier.

For a successful `username` and `password` combination, the `authenticate` function will return:

```js
{
  authenticated: true,
  token: "xxxxx.yyyyy.zzzzz",
  id: 1,
  fullName: "Rune Madsen",
  avatar: "https://gravatar.com/runemadsen"
}
```

For an unsuccessful `username` and `password` combination, the `authenticate` function will return:

```js
{
  authenticated: false,
}
```

These responses reflect what the JSON responses from the API endpoint should be.

#### Proxy API endpoint

Use the `proxy` function to send enable the data provider to load and save data to GitHub.

> TODO: resourceIds must be there

```js
TODO;
```

### Using the `authProvider` and `dataProvider`

```
TODO!
```
