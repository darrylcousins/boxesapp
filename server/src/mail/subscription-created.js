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
  const email = subscription.attributes.customer.email;
  const title = "Box Subscription Created";
  const subject = `${title} ${subscription.attributes.title} - ${subscription.attributes.variant}`;
  const templateFile = "subscription-created";

  const opts = {
    to: email,
    title,
    subject,
    templateFile,
    subscriptions,
    type: "created",
  };

  return await buildMail(opts);
};
