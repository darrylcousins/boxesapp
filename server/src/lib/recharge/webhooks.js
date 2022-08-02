/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { Recharge } from "./index.js";

import chargeCreated from "../../webhooks/recharge/charge-created.js";
import chargeUpcoming from "../../webhooks/recharge/charge-upcoming.js";
import chargeUpdated from "../../webhooks/recharge/charge-updated.js";
import orderCreated from "../../webhooks/recharge/order-created.js";
import orderUpcoming from "../../webhooks/recharge/order-upcoming.js";
import subscriptionCreated from "../../webhooks/recharge/subscription-created.js";
import subscriptionUpdated from "../../webhooks/recharge/subscription-updated.js";

export const webhook_topics = {
  "SUBSCRIPTION_CREATED": subscriptionCreated,
  "SUBSCRIPTION_UPDATED": subscriptionUpdated,
  "ORDER_CREATED": orderCreated,
  "ORDER_UPCOMING": orderUpcoming,
  "CHARGE_CREATED": chargeCreated,
  "CHARGE_UPCOMING": chargeUpcoming,
  "CHARGE_UPDATED": chargeUpdated,
};

export const addRechargeWebhooks = () => {
  const path = "recharge";
  for (const [topic, handler] of Object.entries(webhook_topics)) {
    Recharge.Registry.addHandler({topic, path, handler});
  };
};

