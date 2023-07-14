/*
 * @module mail/sendmail-job.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import Mailer from "nodemailer"; 
import { winstonLogger } from "../../config/winston.js";
import "dotenv/config";

const getLogger = () => {
  if (typeof _logger === "undefined") {
    return winstonLogger;
  } else {
    return _logger;
  };
};

export default async ({to, subject, text, html, attachments}) => {

  const logger = getLogger();
  let dkimKey;
  let dkim;
  const dkimKeyPath = path
    .join(path.dirname(fileURLToPath(import.meta.url)), ".dkimKey")

  try {
    if (fs.existsSync(dkimKeyPath)) {
      dkimKey = fs.readFileSync(dkimKeyPath, {
          encoding:'utf8', flag:'r'
        });
      dkim = {
        domainName: process.env.MAIL_DOMAIN,
        keySelector: "mail",
        privateKey: dkimKey,
      };
    } else {
      const meta = {
        recharge: {
          email: to,
          subject,
        }
      };
      logger.notice(`Sendmail - missing dkim key file.`, { meta });
    };
  } catch(err) {
    logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  let transporter = Mailer.createTransport({
    sendmail: true,
    newline: "unix",
    path: "/usr/sbin/sendmail",
    secure: true,
    dkim,
  });
  const options = {
    to,
    from: `"${process.env.SHOP_TITLE}" <donotreply@boxesapp.nz>`,
    subject,
    text,
    html,
    attachments,
  };
  return transporter.sendMail(options);
};



