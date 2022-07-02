import { get } from "./utils";

const buildJsonDataProvider = proxyUrl => {
  return {
    getList: (resource, params) => {
      return get(proxyUrl, {
        resource,
        sort: JSON.stringify(params.sort),
        pagination: JSON.stringify(params.pagination),
        filter: JSON.stringify(params.filter)
      }).then(data => {
        console.log("data", data);
        return data;
      });
    },
    getOne: (resource, params) => {
      return get(proxyUrl, {
        resource: resource,
        id: params.id
      }).then(data => {
        console.log("data", data);
        return data;
      });
    }
  };
};

export default buildJsonDataProvider;
