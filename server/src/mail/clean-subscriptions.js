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
export default async ({ orphans, date_mismatch }) => {
  const email = `${process.env.ADMIN_EMAIL}, ${process.env.SERVER_EMAIL}`;
  const title = "Verify Subscriptions";
  const subject = `${title} (runs nightly)`;
  const templateFile = "clean-subscriptions";

  const opts = {
    to: email,
    title,
    subject,
    templateFile,
    orphans,
    date_mismatch,
  };

  return await buildMail(opts);
};
