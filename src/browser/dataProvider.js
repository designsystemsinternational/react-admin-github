import { get, put, del, addSettingsToPayload } from "./utils";

const buildDataProvider = (proxyUrl, settings) => {
  const { resources } = settings;

  return {
    /**
      Get a list of resources.
    **/
    getList: (resource, params) => {
      const { pagination, sort } = params;

      const query = {
        action: "contents",
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
        action: "contents",
        resource: resource,
        id: params.id
      };

      addSettingsToPayload(settings, resource, query);

      return get(proxyUrl, query);
    },

    getMany: (resource, params) => {
      return get(proxyUrl, {
        action: "contents",
        resource: resource,
        ids: JSON.stringify(params.ids)
      });
    },
    // getManyReference

    /**
      Create a resource
    **/
    create: (resource, params) => {
      return put(proxyUrl, {
        action: "contents",
        resource: resource,
        data: params.data
      });
    },

    /**
      Update a resource
    **/
    update: (resource, params) => {
      const body = {
        action: "contents",
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
        action: "contents",
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
