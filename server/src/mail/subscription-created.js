/*
 * @module mail/charge-upcoming.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import buildMail from "./build-mail.js";

/*
 * @function mail/charge-upcoming.js
 * @param (object) data
 */
export default async ({ subscriptions }) => {
  const subscription = subscriptions[0];
  const attributes = subscription.attributes;
  const email = attributes.customer.email;
  const title = "Box Subscription Created";
  const subject = `${title} ${attributes.title} - ${attributes.variant}`;
  const templateFile = "subscription-created";

  // logging meta data - becomes meta.recharge for notices
  const meta = {
    customer_id: subscription.attributes.customer.id,
    charge_id: subscription.attributes.charge_id,
    subject,
    email,
  };

  const opts = {
    to: email,
    title,
    subject,
    templateFile,
    subscriptions,
    attributes,
    type: "created",
    meta,
  };

  return await buildMail(opts);
};
