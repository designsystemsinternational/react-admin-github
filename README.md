# React Admin GitHub

The goal of this package is to enable GitHub as a backend to websites created with [`react-admin`](https://marmelab.com/react-admin/). This is a great option if you are making static websites with content in JSON files, and you just want a simple CMS that sits on top of this file structure.

## What is included?

This package has three main pieces:

1. **API functions**. These allow you to create a simple API that serves as a proxy between the static site and the GitHub app. This is needed because the static site cannot expose the GitHub access token. These functions are written so they can be used in both server and serverless environments.
2. **React Admin Auth Provider**. An auth provider for `react-admin` that interacts with the proxy API to authenticate a user based on JSON files in the repository.
3. **React Admin Data Provider**. A data provider for `react-admin` that allows you to load and save JSON files directly from the GitHub repository.

## Getting Started

### Creating the API

You will need to use this package to create two API routes that can be called by the auth and data providers. The examples below show how to use the exported functions in an AWS Lambda environment, but the concept should be easily transferred to Netlify Functions or an Express.js app running on Heroku.

#### Auth API endpoint

Use the `authenticate` function to authenticate a given `username` and `password`.

> TODO: Explain how the JWT works

```js
TODO!
```

> TODO: Explain how `user/repo/folder` works!

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

```js
TODO;
```

### Using the `authProvider` and `dataProvider`

```
TODO!
```
