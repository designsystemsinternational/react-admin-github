import { HttpError } from "react-admin";
import { get, put, del, addSettingsToPayload, hasSettings } from "./utils";

const buildDataProvider = (proxyUrl, settings) => {
  const { resources } = settings;

  return {
    /**
      Get a list of resources.
    **/
    getList: (resource, params) => {
      const { pagination, sort } = params;

      const query = {
        resource,
        page: pagination.page,
        perPage: pagination.perPage,
        sortField: sort.field,
        sortOrder: sort.order
      };

      addSettingsToPayload(settings, resource, query);

      return get(proxyUrl, query);
    },

    /**
      Get a single resource
    **/
    getOne: (resource, params) => {
      const query = {
        resource: resource,
        id: params.id
      };

      addSettingsToPayload(settings, resource, query);

      return get(proxyUrl, query);
    },

    getMany: (resource, params) => {
      return get(proxyUrl, {
        resource: resource,
        ids: JSON.stringify(params.ids)
      });
    },
    // getManyReference

    /**
      Create a resource
    **/
    create: (resource, params) => {
      const body = {
        resource: resource,
        data: params.data
      };

      // Give the file a name if not there
      // All these names will be slugified and timestamped on the server
      if (!params.data.name) {
        // JSON can be named automatically or with the slug setting
        if (
          hasSettings(settings, resource) &&
          settings.resources[resource].handler === "json"
        ) {
          if (settings.resources[resource].slug) {
            params.data.name =
              params.data[settings.resources[resource].slug] + ".json";
          } else {
            params.data.name = "data.json";
          }
        }
        // Other files must give a name property
        else {
          return Promise.reject(
            new HttpError(
              "You must provide a name property with an extension for the resource to be created",
              500
            )
          );
        }
      }

      addSettingsToPayload(settings, resource, body);

      return put(proxyUrl, body);
    },

    /**
      Update a resource
    **/
    update: (resource, params) => {
      const body = {
        resource: resource,
        data: params.data
      };

      addSettingsToPayload(settings, resource, body);

      return put(proxyUrl, body);
    },

    // updateMany

    /**
      Delete a resource
    **/
    delete: (resource, params) => {
      const query = {
        resource: resource,
        id: params.id
      };

      addSettingsToPayload(settings, resource, query);

      return del(proxyUrl, query);
    }

    // deleteMany
  };
};

export default buildDataProvider;
