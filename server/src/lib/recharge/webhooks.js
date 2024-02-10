/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { Recharge } from "./index.js";

// May still need some of these that have been disabled

import chargeCreated from "../../webhooks/recharge/charge-created.js";
import chargeUpcoming from "../../webhooks/recharge/charge-upcoming.js";
import chargeUpdated from "../../webhooks/recharge/charge-updated.js";
import chargeDeleted from "../../webhooks/recharge/charge-deleted.js";
import orderProcessed from "../../webhooks/recharge/order-processed.js";
import subscriptionCreated from "../../webhooks/recharge/subscription-created.js";
import subscriptionDeleted from "../../webhooks/recharge/subscription-deleted.js";
import subscriptionUpdated from "../../webhooks/recharge/subscription-updated.js";
import subscriptionCancelled from "../../webhooks/recharge/subscription-cancelled.js";
import subscriptionActivated from "../../webhooks/recharge/subscription-activated.js";

export const webhook_topics = {
  "SUBSCRIPTION_CREATED": subscriptionCreated,
  "SUBSCRIPTION_DELETED": subscriptionDeleted,
  "SUBSCRIPTION_UPDATED": subscriptionUpdated,
  "SUBSCRIPTION_ACTIVATED": subscriptionActivated,
  "SUBSCRIPTION_CANCELLED": subscriptionCancelled,
  "ORDER_PROCESSED": orderProcessed,
  "CHARGE_CREATED": chargeCreated,
  "CHARGE_UPCOMING": chargeUpcoming,
  "CHARGE_UPDATED": chargeUpdated,
  "CHARGE_DELETED": chargeDeleted,
};

export const addRechargeWebhooks = () => {
  const path = "recharge";
  for (const [topic, handler] of Object.entries(webhook_topics)) {
    Recharge.Registry.addHandler({topic, path, handler});
  };
};

