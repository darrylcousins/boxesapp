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
      subject: `\[${process.env.DB_NAME}\] [ERROR]`,
      text: `${message} ${JSON.stringify(meta)}`,
      html: `
        ${message}</br>
        </br>
        ${JSON.stringify(meta || {})}</br>
        </br>
      `
    };
    sendmail(opts);
    callback();
    // callback(null, true); // I'm unsure
  };

};
