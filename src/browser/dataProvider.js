import {
  get,
  put,
  del,
  getSettings,
  getResourceSettings,
  addNameAndSlug,
  convertNewFiles
} from "./utils";

const buildDataProvider = (proxyUrl, paramSettings) => {
  const settings = getSettings(paramSettings);

  return {
    /**
      Get a list of resources.
    **/
    getList: (resource, params) => {
      const resSettings = getResourceSettings(settings, resource);
      const { pagination, sort } = params;

      const query = {
        handler: resSettings.handler,
        resource,
        page: pagination.page,
        perPage: pagination.perPage,
        sortField: sort.field,
        sortOrder: sort.order
      };

      return get(proxyUrl, query);
    },

    /**
      Get a single resource
    **/
    getOne: (resource, params) => {
      const resSettings = getResourceSettings(settings, resource);

      const query = {
        handler: resSettings.handler,
        resource: resource,
        id: params.id
      };

      return get(proxyUrl, query);
    },

    getMany: (resource, params) => {
      const resSettings = getResourceSettings(settings, resource);

      return get(proxyUrl, {
        handler: resSettings.handler,
        resource: resource,
        ids: JSON.stringify(params.ids)
      });
    },
    // getManyReference

    /**
      Create a resource
    **/
    create: async (resource, params) => {
      const resSettings = getResourceSettings(settings, resource);

      const body = {
        handler: resSettings.handler,
        resource: resource,
        data: params.data
      };

      addNameAndSlug(resSettings, body);
      await convertNewFiles(settings, resSettings, resource, body);

      return put(proxyUrl, body);
    },

    /**
      Update a resource
    **/
    update: async (resource, params) => {
      const resSettings = getResourceSettings(settings, resource);

      const body = {
        handler: resSettings.handler,
        resource: resource,
        data: params.data
      };

      await convertNewFiles(settings, resSettings, resource, body);

      return put(proxyUrl, body);
    },

    // updateMany

    /**
      Delete a resource
    **/
    delete: (resource, params) => {
      const resSettings = getResourceSettings(settings, resource);

      const query = {
        handler: resSettings.handler,
        resource: resource,
        id: params.id
      };

      return del(proxyUrl, query);
    }

    // deleteMany
  };
};

export default buildDataProvider;
