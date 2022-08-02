const Context = {
  ACCESS_TOKEN: "",
  API_KEY: "",
  API_SECRET_KEY: "",
  SCOPES: [],
  HOST_NAME: "",
  API_VERSION: "",
  API_URL: "",
  initialize: function (params) {
    this.ACCESS_TOKEN = params.ACCESS_TOKEN;
    this.API_KEY = params.API_KEY;
    this.API_SECRET_KEY = params.API_SECRET_KEY;
    this.SCOPES = params.API_SECRET_KEY;
    this.HOST_NAME = params.HOST_NAME;
    this.API_VERSION = params.API_VERSION;
    this.API_URL = params.API_URL;
  },
};
export default Context;
