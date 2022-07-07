import { get, put, del } from "./utils";

const buildJsonDataProvider = proxyUrl => {
  return {
    /**
      Get a list of resources.
      Does not use `filter` or `sort` because it's not supported by GitHub
    **/
    getList: (resource, params) => {
      const { pagination, sort } = params;
      return get(proxyUrl, {
        resource,
        page: pagination.page,
        perPage: pagination.perPage,
        sortField: sort.field,
        sortOrder: sort.order
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
    },

    // updateMany

    /**
      Delete a resource
    **/
    delete: (resource, params) => {
      return del(proxyUrl, {
        resource: resource,
        id: params.id
      });
    }

    // deleteMany
  };
};

export default buildJsonDataProvider;
