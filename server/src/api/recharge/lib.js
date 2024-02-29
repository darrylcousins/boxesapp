/*
 * @module api/lib
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
/*
 * @function getIOSocket
 *
 * A function to return io and socket
 */
export const getIOSocket = (req) => {
  let io;
  let sockets;
  const { session_id } = req.body;
  if (typeof session_id !== "undefined") {
    sockets = req.app.get("sockets");
    if (sockets && Object.hasOwnProperty.call(sockets, session_id)) {
      const socket_id = sockets[session_id];
      io = req.app.get("io").to(socket_id);
      io.emit("message", "Received request, processing data...");
    };
  };
  return { io, session_id };
};

/*
 * @function makeIntervalForFinish
 *
 * A function to return io and socket
 */
export const makeIntervalForFinish = ({req, io, session_id, entry_id, counter, admin, mailOpts }) => {
  // XXX more testing here because this will crash the server when it fails
  // Fixed by nesting try/catch statements, still unsure which works
  try {
    let entry;
    let timer;
    let count = 0;

    /* consider making this a separate routine because it is duplicated in
     * charge-update and change-box
     */
    setTimeout(() => {
      try {
        let timeTaken;

        const findTime = (counter) => {
          const now = new Date();
          const millis = now.getTime() - counter.getTime();
          const minutes = Math.floor(millis / 60000);
          const seconds = ((millis % 60000) / 1000).toFixed(0);
          return seconds == 60 ?
              (minutes+1) + ":00" :
              minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
        };

        timer = setInterval(async () => {
          /* stopped the auto explainer and just provided a link for the curious
          count === 5 && !admin ? io.emit("explainer") : io.emit("message", "Working ...");
          */
          io.emit("message", "Working ...");
          if (count % 10 === 0) {
            io.emit("message", `Update times of over 3 minutes are possible. ${counter && findTime(counter)}`);
            io.emit("message", "You may close this window and come back later.");
            io.emit("message", "A confirmation email will be sent on completion.");
          };
          entry = await _mongodb.collection("updates_pending").findOne({ "_id": entry_id });
          // ensure also that interval is cleared if the socket is closed even if updates are still completing
          if (!entry || !Object.hasOwnProperty.call(req.app.get("sockets"), session_id)) {
            clearInterval(timer);
            try {
              // compile data for email to customer the updates have been completed
              if (counter) {
                timeTaken = findTime(counter);
              };
              mailOpts.counter = timeTaken;

              // if type is reactivated then we will be missing charge_id from attributes
              // even so with a changed box
              // we can pick it up from the logged message when the entry was removed at webhooks charge/updated
              if (mailOpts.type === "reactivated" || mailOpts.type === "changed") {
                let { address_id, customer, subscription_id, charge_id, scheduled_at } = mailOpts.attributes;
                // using this data, should be able to find the logged meta which will have the charge_id
                const query = {};
                query[`meta.recharge.customer_id`] = parseInt(customer.id);
                query[`meta.recharge.subscription_id`] = parseInt(subscription_id);
                query[`meta.recharge.address_id`] = parseInt(address_id);
                query[`meta.recharge.scheduled_at`] = scheduled_at;
                query[`meta.recharge.update_label`] = mailOpts.type;
                // get the most recent and one only
                const result = await _mongodb.collection("logs").find(query).sort({ timestamp: -1 }).limit(1).toArray();
                if (result.length > 0) {
                  mailOpts.attributes.charge_id = parseInt(result[0].meta.recharge.charge_id);
                } else {
                  console.log("entry not found", query);
                };
              };

              await subscriptionActionMail(mailOpts);

            } catch(err) {
              _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
            };

          };
          count++;
        }, 5000);
      } catch(err) {
        _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      };
    }, 5000);
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



/*
 * @function upsertPending
 *
 * A function to store enough data to check against that all updates have
 * completed and a new charge created or updated.
 *
 * scheduled_at is the target date should that have been changed
 * rc_subscription_ids has this shape for each item
    {
      shopify_product_id: 7517242917014, // could be used to match a new variant?
      subscription_id: 405398703,
      quantity: 1,  // might be zero if to be deleted
      title: 'The Medium Vege Box',
      price: 3500,
      updated: false, // has been updated? or deleted?
    },
 */
export const upsertPending = async (data) => {
  const update_query = {
    customer_id: data.customer_id,
    address_id: data.address_id,
    subscription_id: data.subscription_id, // the box suscription
  };

  /*
  let dtz = new Date()
  dtz = dtz - (dtz.getTimezoneOffset() * 60000)
  */

  const update_pending = {
    ...update_query,
    //label: data.label, // useful descriptor of the action being taken
    action: data.action,
    charge_id: data.charge_id,
    session_id: data.session_id,
    scheduled_at: data.scheduled_at,
    deliver_at: data.deliver_at,
    rc_subscription_ids: data.rc_subscription_ids,
    title: data.title, // the box title
    timestamp: new Date(),
  };

  // always now use this
  //if (Object.hasOwnProperty.call(data, "session_id")) update_pending.session_id = data.session_id;

  //const upsert =  await _mongodb.collection("updates_pending").findOneAndUpdate(
  const upsert =  await _mongodb.collection("updates_pending").findOneAndUpdate(
    update_query,
    { "$set" : update_pending },
    { 
      "upsert": true,
      "returnDocument": "after",
    }
  );
  // error checking?
  //console.log(upsert);
  //console.log("updserted data", upsert);

  return upsert._id;
};
