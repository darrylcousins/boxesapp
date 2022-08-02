/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import appUninstalled from "../../webhooks/shopify/app-uninstalled.js";
import { Shopify } from "./index.js";

export const webhook_topics = {
  "APP_UNINSTALLED": appUninstalled,
};

export const addShopifyWebhooks = () => {
  const path = "shopify";
  for (const [topic, handler] of Object.entries(webhook_topics)) {
    Shopify.Registry.addHandler({topic, path, handler});
  };
};

