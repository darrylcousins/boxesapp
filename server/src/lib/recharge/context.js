const Context = {
  ACCESS_TOKEN: "",
  CLIENT_SECRET: "",
  HOST_NAME: "",
  API_VERSION: "",
  API_URL: "",
  SHOP_NAME: "",
  initialize: function (params) {
    this.ACCESS_TOKEN = params.ACCESS_TOKEN;
    this.CLIENT_SECRET = params.CLIENT_SECRET;
    this.HOST_NAME = params.HOST_NAME;
    this.API_VERSION = params.API_VERSION;
    this.API_URL = params.API_URL;
    this.SHOP_NAME = params.SHOP_NAME;
  },
};
export default Context;

