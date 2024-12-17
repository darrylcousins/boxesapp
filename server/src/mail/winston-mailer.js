import "dotenv/config";
import { Transport } from "winston";
import sendmail from "./sendmail.js";

export default class WinstonNodemailer extends Transport {

  constructor(props){
    super(props);
    this.name = "WinstonNodemailer";
    this.level = props.level || "error";
    this.admin_email = props.admin_email || process.env.SERVER_EMAIL;
    this.title = props.title || process.env.SHOP_TITLE;
  };

  log(info, callback) {
    const { level, message, ...meta } = info;
    const opts = {
      to: this.admin_email,
      subject: `${process.env.EMAIL_SUBJECT} ERROR`,
      text: `${message} ${JSON.stringify(meta || {}, null, 2)}`,
      html: `
        ${message}</br>
        </br>
        ${JSON.stringify(meta || {}, null, 2)}</br>
        </br>
      `
    };
    sendmail(opts);
    callback();
  };

};
