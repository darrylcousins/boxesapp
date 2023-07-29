/*
 * @module mail/subscription-deleted.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import sendmail from "./sendmail.js";
import "dotenv/config";

import subscriptionDeletedTemplate from "./templates/subscription-deleted.js";
import { makeRechargeQuery } from "../lib/recharge/helpers.js";
/*
 * @function mail/subscription-deleted.js
 * @param (object) data
 */
export default async ({ subscription_id, box, included, admin_email }) => {
  const admin = admin_email ? admin_email : process.env.ADMIN_EMAIL;

  const { customer } = await makeRechargeQuery({
    method: "GET",
    path: `customers/${box.customer_id}`,
  });

  const engine = new Liquid();
  const options = {
    keepComments: false,
  };
  
  try {
    engine
      .parseAndRender(subscriptionDeletedTemplate, {
        subscription_id,
        box,
        included,
        customer,
        env: process.env,
        admin_email: admin,
      })
      .then(sections => {
        const htmlOutput = mjml2html(`
    <mjml>
      <mj-body>
        <mj-section padding-bottom="0px">
          <mj-column>
            <mj-text align="center" font-size="20px" font-style="bold">
            Box Subscription Permanently Deleted
            </mj-text>
          </mj-column>
        </mj-section>
    ${sections}
  </mj-body>
</mjml>
`, options);
        sendmail({
          to: customer.email,
          bcc: `${process.env.BCC_EMAIL}`,
          subject: `${process.env.EMAIL_SUBJECT} Box subscription deleted ${box.product_title} - ${box.variant_title}`.trim(),
          html: htmlOutput.html
        });
        const meta = {
          recharge: {
            customer_id: box.customer_id,
            subscription_id: box.id,
            box: `${box.product_title} - ${box.variant_title}`,
            email: customer.email,
          }
        };
        _logger.notice(`Recharge subscription deleted email sent.`, { meta });
      });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



