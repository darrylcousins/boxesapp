/*
 * @module mail/subscription-cancelled.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import sendmail from "./sendmail.js";
import "dotenv/config";

import subscriptionCancelledTemplate from "./templates/subscription-cancelled.js";
/*
 * @function mail/charge-upcoming.js
 * @param (object) data
 */
export default async ({ subscription_id, attributes, includes, admin_email }) => {
  const admin = admin_email ? admin_email : process.env.ADMIN_EMAIL;

  const engine = new Liquid();
  const options = {
    keepComments: false,
  };
  
  try {
    engine
      .parseAndRender(subscriptionCancelledTemplate, {
        subscription_id,
        attributes,
        includes,
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
            Box Subscription Cancelled
            </mj-text>
          </mj-column>
        </mj-section>
    ${sections}
  </mj-body>
</mjml>
`, options);
        sendmail({
          to: `${attributes.customer.email}`,
          bcc: `${process.env.BCC_EMAIL}`,
          subject: `${process.env.EMAIL_SUBJECT} Box subscription cancelled ${attributes.title} - ${attributes.variant}`.trim(),
          html: htmlOutput.html
        });
        const meta = {
          recharge: {
            customer_id: attributes.customer.id,
            charge_id: attributes.charge_id,
            box: `${attributes.title} - ${attributes.variant}`,
            email: attributes.customer.email,
          }
        };
        _logger.notice(`Recharge subscription cancelled email sent.`, { meta });
      });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

