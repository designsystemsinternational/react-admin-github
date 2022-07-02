import { get, put } from "./utils";

const buildJsonDataProvider = proxyUrl => {
  return {
    /**
      Get a list of resources.
      Does not use `filter` or `sort` because it's not supported by GitHub
    **/
    getList: (resource, params) => {
      const { pagination } = params;
      return get(proxyUrl, {
        resource,
        page: pagination.page,
        perPage: pagination.perPage
      });
    },

    /**
      Get a single resource
    **/
    getOne: (resource, params) => {
      return get(proxyUrl, {
        resource: resource,
        id: params.id
      });
    },

    /**
      Create a resource
    **/
    create: (resource, params) => {
      return put(proxyUrl, {
        resource: resource,
        data: params.data
      });
    },

    /**
      Update a resource
    **/
    update: (resource, params) => {
      return put(proxyUrl, {
        resource: resource,
        data: params.data
      });
    }
  };
};

export default buildJsonDataProvider;
