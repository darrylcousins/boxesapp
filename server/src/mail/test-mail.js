import sendmail from "./sendmail.js";

const main = async () => {

  sendmail({
    to: 'darryljcousins@gmail.com',
    subject: 'Testing a mail with my sendmail',
    text: 'Your message in text', // Optional, but recommended
  })
};

main().catch(console.error);

