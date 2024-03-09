/*
 * @module mail/build-mail.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import sendmail from "./sendmail.js";
import { winstonLogger } from "../../config/winston.js";
import "dotenv/config";

const getLogger = () => {
  if (typeof _logger === "undefined") {
    return winstonLogger;
  } else {
    return _logger;
  };
};

/*
 * @function mail/charge-upcoming.js
 * @param (object) data
 */
export default async (opts) => {

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // test for logo files - served by nginx
  const siteLogoFile = `${ process.env.SHOP_NAME }.jpg`; // put in server/assets/logos/
  const boxesLogoFile = "boxes.png";

  const siteLogo = fs.existsSync(path.resolve(process.env.SERVER_ROOT, "assets/logos", siteLogoFile));
  const boxesLogo = fs.existsSync(path.resolve(process.env.SERVER_ROOT, "assets/logos", boxesLogoFile));

  const engine = new Liquid({
    root: path.resolve(__dirname, 'templates/'),  // root for layouts/includes lookup
    extname: '.liquid',
  });
  const options = {
    keepComments: false,
    jsTruthy: true,
  };

  try {
    await engine
      .renderFile(opts.templateFile, {
        ...opts,
        boxesLogo,
        siteLogo,
        env: process.env,
        admin_email: process.env.ADMIN_EMAIL,
      })
      .then(async body => {
        const htmlOutput = mjml2html(`
<mjml>
  <mj-head>
    <mj-title>${opts.subject}</mj-title>
    <mj-attributes>
      <mj-text padding="0" />
      <mj-all font-family="sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body>
    ${body}
  </mj-body>
</mjml>
`, options);

        await sendmail({
          to: `${opts.to}`,
          bcc: `${process.env.BCC_EMAIL}`,
          subject: `${process.env.EMAIL_SUBJECT} ${opts.subject}`.trim(),
          html: htmlOutput.html
        });
        if (opts.meta) {
          const description = `${opts.title.charAt(0).toUpperCase()}${opts.title.substring(1).toLowerCase()}`;
          getLogger().notice(`${description} email sent.`, { meta: { recharge: opts.meta } });
        };
      });

  } catch(err) {
    getLogger().error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

