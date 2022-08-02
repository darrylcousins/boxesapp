/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { Shopify } from "./index.js";

import appUninstalled from "../../webhooks/shopify/app-uninstalled.js";
import ordersCreate from "../../webhooks/shopify/orders-create.js";
import ordersUpdated from "../../webhooks/shopify/orders-updated.js";
import productsUpdate from "../../webhooks/shopify/products-update.js";

export const webhook_topics = {
  "APP_UNINSTALLED": appUninstalled,
  "ORDERS_CREATE": ordersCreate,
  "ORDERS_UPDATED": ordersUpdated,
  "PRODUCTS_UPDATE": productsUpdate,
};

export const addShopifyWebhooks = () => {
  const path = "shopify";
  for (const [topic, handler] of Object.entries(webhook_topics)) {
    Shopify.Registry.addHandler({topic, path, handler});
  };
};

