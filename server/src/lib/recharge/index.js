/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { MongoStore } from "../mongo/mongo.js";
import Context from "./context.js";
import Registry from "./registry.js";

export const Recharge = {
  Context,
  Registry: null,
  initialize: async function () {
    const context = {
      ACCESS_TOKEN: process.env.RECHARGE_ACCESS_TOKEN,
      CLIENT_SECRET: process.env.RECHARGE_CLIENT_SECRET,
      HOST_NAME: process.env.HOST,
      API_VERSION: process.env.RECHARGE_VERSION,
      API_URL: process.env.RECHARGE_URL,
      SHOP_NAME: process.env.RECHARGE_SHOP_NAME,
    };

    this.Context.initialize(context);
    this.Registry = new Registry({
      store: new MongoStore({
        mongodb: _mongodb,
        collection: "registry"
      }),
    });
  },
};

