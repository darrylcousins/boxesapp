/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { Recharge } from "./index.js";

// May still need some of these that have been disabled

import chargeUpcoming from "../../webhooks/recharge/charge-upcoming.js";
import orderProcessed from "../../webhooks/recharge/order-processed.js";
import subscriptionCreated from "../../webhooks/recharge/subscription-created.js";
import subscriptionUpdated from "../../webhooks/recharge/subscription-updated.js";

export const webhook_topics = {
  "SUBSCRIPTION_CREATED": subscriptionCreated,
  "SUBSCRIPTION_UPDATED": subscriptionUpdated,
  "ORDER_PROCESSED": orderProcessed,
  "CHARGE_UPCOMING": chargeUpcoming,
};

export const addRechargeWebhooks = () => {
  const path = "recharge";
  for (const [topic, handler] of Object.entries(webhook_topics)) {
    Recharge.Registry.addHandler({topic, path, handler});
  };
};

