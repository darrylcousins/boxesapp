/**
 * Socket code
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { io } from "socket.io-client";
import { sleepUntil } from "./helpers";

/*
 * Get and connect to socket.io, on connect insert the session_id into the
 * data then call the submission method 'callback'
 * @function getSessionId
 *
 * This is disabled at the moment see saveChanges method for registration.
 * But the idea was instead of using Timer to reload every 30 seconds until
 * complete, we could wait for a signal via a socket that would indicate the
 * the server side process had been completed.
 */
const appendMessage = async (start, data, colour, divId) => {
  //console.log(data);
  let text;
  if (window.innerWidth < 500) {
    text = `${data}`;
  } else {
    text = `${start} ${data}`;
  };

  await sleepUntil(() => document.getElementById(divId), 50)
    .then((res) => {
      const socketMessages = res;
      if (socketMessages) {
        socketMessages.classList.add("pa3"); // only add padding when we have content - whitespace fix
        let innerDiv = socketMessages.firstElementChild;
        if (!innerDiv) {
          innerDiv = document.createElement("div");
          socketMessages.appendChild(innerDiv);
        };
        let message = document.createElement("p");
        message.classList.add("mt0", "mb1", "pv0", "truncate", colour);
        message.textContent = text;
        innerDiv.appendChild(message);
        socketMessages.scrollTo({
          top: socketMessages.scrollHeight,
          behavior: "smooth",
        });
        /*
        const rect = socketMessages.getBoundingClientRect();
        const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
        if (rect.bottom - viewHeight >= 0) {
          const y = rect.bottom + window.pageYOffset + 50;
          window.scrollTo({top: y, behavior: 'smooth'});
        };
        */
      };
    }).catch((e) => {
      // no need for action
    });
};

export const getSessionId = async (callback, data, divId, component) => {
  const proxy = localStorage.getItem("proxy-path");
  const session_id = Math.random().toString(36).substr(2, 9);
  const host = `https://${ window.location.host }`;
  const socket = io(host, {
    autoConnect: true, // could also do this with socket.open()
    path: `${proxy}/socket-io`,
    transports: ["polling"], // disable websocket polling - no wss on shopify
  });
  socket.emit('connectInit', session_id);
  socket.on('connected', async (id) => {
    console.log("connection opened with id", id);
    // do the work
    data.session_id = id;
    await callback(data);
  });
  socket.on('fail', async (data) => { // unused for now
    const start = `[warn]`.padEnd(9);
    await appendMessage(start, data, "red", divId);
  });
  socket.on('message', async (data) => { // start and othe info
    const start = `[info]`.padEnd(9);
    await appendMessage(start, data, "dark-blue", divId);
  });
  socket.on('progress', async (data) => { // usually progress from bull job
    const start = `[step]`.padEnd(9);
    await appendMessage(start, data, "black", divId);
  });
  socket.on('completed', async (data) => { // usually from webhook confiming update from Recharge
    const start = `[success]`.padEnd(9);
    await appendMessage(start, data, "dark-green", divId);
  });
  socket.on('error', async (data) => { // usually progress from bull job
    const start = `[error]`.padEnd(9);
    await appendMessage(start, data, "red", divId);
  });
  socket.on('created.complete', async (data) => {
    // some care needed here to make sure we send to the correct component
    if (data.session_id === session_id) {
      console.log('closing connection for id', session_id);
      const start = `[success]`.padEnd(9);
      const message = "Subscription created.";
      await appendMessage(start, message, "dark-green", divId);
      const msg = "Finished, closing connection";
      await appendMessage(start, msg, "dark-green", divId);

      // pick up socket.closed with Subscription and subscription.created with Customer
      //let event = data.action !== "created" ? "socket.closed" : "subscription.created";

      // finished is sent on completion of updates, it comes from:
      // * webhook recharge/charge-updated
      // * webhook recharge/charge-deleted
      // * webhook recharge/subscription-updated
      // We send "updates.completed" which is captured by Subscription
      window.dispatchEvent(
        new CustomEvent("created.complete", {
          bubbles: true,
          detail: { ...data },
        })
      );
    };
  });
  socket.on('finished', async (data) => { // usually progress from bull job
    const start = `[success]`.padEnd(9);
    const message = "Finished, closing connection";
    console.log(message);
    await appendMessage(start, message, "dark-green", divId);
    socket.disconnect();
    window.dispatchEvent(
      new CustomEvent("socket.closed", {
        bubbles: true,
        detail: { ...data },
      })
    );
  });
  /*
  socket.on('connect', async () => {
    if (id === session_id) {
      console.log('connected with id', id);
    };
  });
  */
  socket.on('disconnect', async () => {
    console.log("connection closed with id", session_id);
    socket.disconnect();
  });
};


