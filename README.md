# React Admin GitHub

The goal of this package is to enable GitHub as an authentication and data provider to websites using [`react-admin`](https://marmelab.com/react-admin/). We often have the need for providing a simple editing interface on top of a Git repository, and this package is trying to solve that need. Given that the GitHub API is a bit different than an API backed by a traditional database, this package has a few limitations:

- **A max of 1000 entries for a single resource**. This is because neither the Git Tree nor the Git Contents API supports pagination on file data, and those endpoints return up to 1000 items.
- **Limited data on lists**. When loading resource lists, only a few fields such as `name` and `createdAt` are accessible. This is because we cannot load the content of each JSON file on lists.
- **1MB filesize**. The GitHub Contents API only allows loading of files up to 1MB. This is most apparent when using the `ImageField` to preview uploaded images. Since large uploads are allowed, this package will show a fallback image when trying to preview an image larger than 1MB.

You can see a working example with `react-admin`, `react-admin-github` and `gatsby` here:
https://github.com/designsystemsinternational/react-admin-github-example

This package ships with three main pieces of functionality:

## Auth Provider

The Auth Provider uses a list of JSON files with user data from the GitHub repository to handle authentication and user management. You can create, edit or delete these JSON files in the repo directly or with a `users` resource, and this will determine whether users can log in to your `react-admin` website.

The Auth Provider **does not** use the GitHub OAuth flow as a login to your `react-admin` site, as we don't want to require our `react-admin` users to create GitHub accounts.

### Usage

You use the Auth Provider with the `buildAuthProvider` function that allows you to pass in the URL to the proxy function (which you can read more about below).

```js
import { buildAuthProvider } from "@designsystemsinternational/react-admin-github";

const authProvider = buildAuthProvider("url.to/proxy");

const AdminPage = () => {
  return <Admin authProvider={authProvider}>...</Admin>;
};
```

### Seeding with the first user

There is a helper function to generate the file contents for a user, since you won't be able to log in unless the `content/users` folder is empty. This is how you use it from the Node repl:

```
$ node
> const { logUserInfo } = require("@designsystemsinternational/react-admin-github/src/node/utils");
> logUserInfo('my@email.com', 'mypassword');
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

The Data Provider uses an authentication token set by the Auth Provider to communicate with the proxy function. It comes with a number of handlers that can be used to create different types of resources.

### Usage

You use the Data Provider with the `buildDataProvider` function that allows you to pass in the URL to the proxy function (which you can read more about below). The build function also accepts a settings object that you can use to specify the handler for different resources.

```js
import { buildDataProvider } from "@designsystemsinternational/react-admin-github";

const dataProvider = buildDataProvider("url.to/proxy", {});

const AdminPage = () => {
  return <Admin dataProvider={dataProvider}>...</Admin>;
};
```

The following settings are available:

- `disableTimestamp` can be used to disable timestamps when the `files` or `json` handler creates new files.

You can pass these settings as either global settings that apply to all resources:

```js
const dataProvider = buildDataProvider("url.to/proxy", {
  disableTimestamp: true
});
```

Or just can pass them for an individual resource:

```js
const dataProvider = buildDataProvider("url.to/proxy", {
  resources: {
    posts: {
      disableTimestamp: true
    }
  }
});
```

### `files` handler

This is the default handler and it doesn't require any settings. It will load files from a folder named after the resource (e.g. an `images` resource expects to load files from `content/images` in the repository), and each file will return the data below. The `_ragInfo` is a namespaced object containing info about the file.

```json
{
  "id": "2022-01-01-12-00-00-myimage.png",
  "_ragInfo": {
    "name": "2022-01-01-12-00-00-myimage.png",
    "path": "content/images/2022-01-01-12-00-00-myimage.png",
    "type": "file",
    "slug": "myimage",
    "ext": "png",
    "createdAt": "2022-01-01T12:00:00Z"
  }
}
```

> TODO: Document how to set up a form that uploads a new file

### `json` handler

This handler loads JSON files from a folder named after the resource (e.g. a `posts` resource expects to load files from `content/posts` in the repository), and each file will return the same data as the `files` handler, but with the JSON data added to the payload.

```json
{
  "id": "2022-01-01-12-00-00-myimage.png",
  "_ragInfo": {
    "name": "2022-01-01-12-00-00-myimage.png",
    "path": "content/images/2022-01-01-12-00-00-myimage.png",
    "type": "file",
    "slug": "myimage",
    "createdAt": "2022-01-01T12:00:00Z"
  },
  "your": "json",
  "another": "property"
}
```

The only constraint to your JSON files is that they cannot have an `id` or `_ragInfo` property, as these get added dynamically by the proxy function. This is how you set up the `json` handler for a `posts` resource with the `buildDataProvider` function:

```js
const dataProvider = buildDataProvider("url.to/proxy", {
  resources: {
    posts: {
      handler: "json",
      filenameFromProperty: "title"
    }
  }
});
```

The following settings are available for the `json` handler:

- `filenameFromProperty` can be set to the name of the `react-admin` field that you want to use in the filename of the JSON file. Along with the `disableTimestamp` setting, this can be used to control the name of the JSON files.
- `uploadJsonFilesTo` is used when the Data Provider detects new file fields in the `<Create>` or `<Edit>` form. The data provider will automatically convert these files to base64, upload alongside the other JSON data, save these files in the GitHub repo, and replace the property with a file object with a relative path to the files folder. This setting allows you to specify where inside the `content` folder these files are uploaded to. The default is to upload files to a folder named after the JSON file inside the resource folder (e.g. `content/posts/my-post/image.png` for a `content/posts/my-post.json` file). You need to pass a function that accepts a `resource` and `data` parameter and returns a string path with the folder name (without the `content` path).

The `json` handler also has special handling for resources named `users`, where it will has the password on the server in order to make it possible to CRUD users from `react-admin`.

Refer to the [example](https://github.com/designsystemsinternational/react-admin-github-example) to see how to use this handler.

### `releases` handler

This handler enables GitHub releases as a resource in `react-admin`. It is automatically enabled for resources named `releases`, or it can be enabled for other resources, such as a `deploys` resource in the example below.

```js
const dataProvider = buildDataProvider("url.to/proxy", {
  resources: {
    deploys: {
      handler: "releases"
    }
  }
});
```

The data returned for this handler is the GitHub Releases api response with camel-cased properties to ensure compability with the other handlers. A special feature of the `releases` handler is that it will also load the current Github Actions workflow runs and add a `action` property to the release if an action was triggered by this release. We use this to create a way for users to trigger a deployment of the static site from `react-admin` itself.

Refer to the [example](https://github.com/designsystemsinternational/react-admin-github-example) to see how to use this handler.

## API function

When communicating with the GitHub API, you need a personal access token or App secret, and these cannot be exposed on your static website. Therefore, this package ships with a single proxy function that can be used in any serverless framework (AWS Lambda, Netlify Functions, etc) or cloud server (EC2, Heroku, etc) to proxy calls to the GitHub API. This function holds all the functionality needed to run the `authProvider` and `dataProvider`, and it needs to be mounted in a serverless function that accepts `GET`, `POST`, `PUT`, `PATCH` and `DELETE` HTTP calss.

This is how to set up the proxy function as a Netlify function:

```js
const proxy = require("@designsystemsinternational/react-admin-github/src/node");

const handler = async event => {
  const response = await proxy({
    httpMethod: event.httpMethod,
    httpQuery: event.queryStringParameters,
    httpHeaders: event.headers,
    httpBody: event.body,
    repo: "OWNER/REPO",
    token: "GITHUB_PERSONAL_ACCESS_TOKEN",
    secret: "SECRET_USED_FOR_ENCODING_JWT",
    url: "URL_TO_PROXY_FUNCTION"
  });
  return response;
};

module.exports = {
  handler
};
```

This is how to set up the function with an AWS lambda function using the 2.0 payload:

```js
const proxy = require('@designsystemsinternational/react-admin-github/src/node');

const handler = async event => {
  return await proxy({
    httpMethod: event.requestContext.http.method,
    httpQuery: event.queryStringParameters,
    httpHeaders: event.headers,
    httpBody: event.body,
    repo: "OWNER/REPO",
    token: "GITHUB_PERSONAL_ACCESS_TOKEN",
    secret: "SECRET_USED_FOR_ENCODING_JWT"
    url: "URL_TO_PROXY_FUNCTION"
  });
};

module.exports = {
  handler
};
```

Beware that the proxy function is also used to serve images from the GitHub repo, so the serverless function needs to handle base64 encoded strings when `response.isBase64Encoded` is set to true.

## Example

This example demonstrates how to use this package:
https://github.com/designsystemsinternational/react-admin-github-example
