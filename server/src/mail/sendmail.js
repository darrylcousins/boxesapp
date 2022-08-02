/*
 * @module mail/sendmail.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import Mailer from "nodemailer"; 
import "dotenv/config";

export default async ({to, subject, text, html, attachments}) => {

  const dkimKey = fs.readFileSync(path
    .join(path.dirname(fileURLToPath(import.meta.url)), ".dkimKey"), {
      encoding:'utf8', flag:'r'
    });

  let transporter = Mailer.createTransport({
    sendmail: true,
    newline: "unix",
    path: "/usr/sbin/sendmail",
    secure: true,
    dkim: {
      domainName: process.env.MAIL_DOMAIN,
      keySelector: "mail",
      privateKey: dkimKey,
    }
  });
  const options = {
    to,
    from: `"BoxesAppMailer" <donotreply@boxesapp.nz>`,
    subject,
    text,
    html,
    attachments,
  };
  return transporter.sendMail(options);
};


