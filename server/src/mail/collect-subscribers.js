/*
 * @module mail/charge-upcoming.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import buildMail from "./build-mail.js";
import "dotenv/config";

/*
 * @function mail/clean-subscriptions.js
 * @param (object) data
 */
export default async (opts) => {
  const email = `${process.env.ADMIN_EMAIL}, ${process.env.SERVER_EMAIL}`;
  const title = "Collect Subscribers";
  const subject = `${title} (runs nightly)`;
  const templateFile = "collect-subscribers";

  const options = {
    ...opts,
    to: email,
    title,
    subject,
    templateFile,
  };

  return await buildMail(options);
};
