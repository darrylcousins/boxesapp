/*
 * @module mail/charge-upcoming.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import sendmail from "./sendmail.js";
import "dotenv/config";

import collectSubscribersTemplate from "./templates/collect-subscribers.js";

/*
 * @function mail/clean-subscriptions.js
 * @param (object) data
 */
export default async (opts) => {
  
  const { 
    existingCount,
    updatedCount,
    activeCount,
    inactiveCount,
    activeNoChargeCount,
    activeNoCharges,
  } = opts; 

  const engine = new Liquid();
  const options = {
    keepComments: false,
  };
  
  try {
    engine
      .parseAndRender(collectSubscribersTemplate, {
        existingCount,
        updatedCount,
        activeCount,
        inactiveCount,
        activeNoChargeCount,
        activeNoCharges,
        env: process.env,
      })
      .then(sections => {
        const htmlOutput = mjml2html(`
    <mjml>
      <mj-body>
        <mj-section padding-bottom="0px">
          <mj-column>
            <mj-text align="center" font-size="20px" font-style="bold">
            Collect and update boxesapp customer database (runs nightly)
            </mj-text>
          </mj-column>
        </mj-section>
    ${sections}
  </mj-body>
</mjml>
`, options);
        sendmail({
          to: `${process.env.ADMIN_EMAIL}, ${process.env.SERVER_EMAIL}`,
          subject: `\[${process.env.SHOP_NAME}\] Collect/update customers`,
          html: htmlOutput.html
        });
      });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


