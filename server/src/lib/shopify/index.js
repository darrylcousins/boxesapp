/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { MongoStore } from "../mongo/mongo.js";
import Context from "./context.js";
import Registry from "./registry.js";

export const Shopify = {
  Context,
  Registry: null,
  initialize: async function () {
    let accessToken = null;
    const session = await _mongodb.collection("shopify_sessions").findOne({shop: process.env.SHOP});
    if (session) accessToken = session.access_token;

    const context = {
      ACCESS_TOKEN: accessToken,
      API_KEY: process.env.SHOPIFY_API_KEY,
      API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
      SCOPES: process.env.SHOPIFY_SCOPES.split(","),
      HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
      API_VERSION: process.env.SHOPIFY_API_VERSION,
      API_URL: `https://${process.env.SHOP}`,
    };

    this.Context.initialize(context);
    this.Registry = new Registry({
      context: this.Context,
      store: new MongoStore({
        mongodb: _mongodb,
        collection: "registry"
      }),
    });
  },
  addToken: function (access_token) {
    this.Context.ACCESS_TOKEN = access_token;
  },
};
