import { HttpError } from "react-admin";
import { get, put, del, addHandler, addName, addFilesAndImages } from "./utils";

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

      addHandler(settings, resource, query);

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

      addHandler(settings, resource, query);

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
    create: async (resource, params) => {
      const body = {
        resource: resource,
        data: params.data
      };

      addHandler(settings, resource, body);

      addName(settings, resource, body);
      if (!body.data.name) {
        return Promise.reject(
          new HttpError("No name property found or generated", 500)
        );
      }

      await addFilesAndImages(settings, resource, body);

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

      addHandler(settings, resource, body);

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

      addHandler(settings, resource, query);

      return del(proxyUrl, query);
    }

    // deleteMany
  };
};

export default buildDataProvider;
