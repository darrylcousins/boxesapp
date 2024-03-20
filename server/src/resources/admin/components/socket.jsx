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
const appendMessage = async (data, colour, divId) => {
  //console.log(data);

  /* helper method to check if we to scroll messages into view
  */
  const checkVisible = (elm) => {
      var rect = elm.getBoundingClientRect();
      var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    //return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
      return !(rect.bottom - viewHeight >= 0);
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
        message.classList.add("mt0", "mb1", "pv0", colour);
        message.textContent = data;
        innerDiv.appendChild(message);
        socketMessages.scrollTo({
          top: socketMessages.scrollHeight,
          behavior: "smooth",
        });
        if (!checkVisible(socketMessages)) {
          socketMessages.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
        };
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
    //console.log('fail', data);
    // display data or update timer
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const d = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const start = `[warn]`.padEnd(9);
    await appendMessage(`${start} [${d}] ${data}`, "red", divId);
  });
  socket.on('message', async (data) => { // start and othe info
    //console.log('message', data);
    // display data or update timer
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const d = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const start = `[info]`.padEnd(9);
    await appendMessage(`${start} [${d}] ${data}`, "dark-blue", divId);
  });
  socket.on('progress', async (data) => { // usually progress from bull job
    //console.log('progress', data);
    // display data or update timer
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const d = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const start = `[step]`.padEnd(9);
    await appendMessage(`${start} [${d}] ${data}`, "black", divId);
  });
  socket.on('completed', async (data) => { // usually from webhook confiming update from Recharge
    //console.log('completed', data);
    // display data or update timer
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const d = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const start = `[success]`.padEnd(9);
    await appendMessage(`${start} [${d}] ${data}`, "dark-green", divId);
  });
  socket.on('error', async (data) => { // usually progress from bull job
    //console.log('progress', data);
    // display data or update timer
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const d = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const start = `[error]`.padEnd(9);
    await appendMessage(`${start} [${d}] ${data}`, "red", divId);
  });
  socket.on('charge', async (charge_id) => { // when the subscription updates are complete (remove updates_pending entry)
    component.dispatchEvent(
      new CustomEvent("charge.updated", {
        bubbles: true,
        detail: { charge_id },
      })
    );
  });
  socket.on('finished', async (data) => {
    // some care needed here to make sure we send to the correct component
    console.log(data);
    if (data.session_id === session_id) {
      console.log('closing connection for id', session_id);
      //console.log(data);
      const date = new Date();
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      const d = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
      const start = `[success]`.padEnd(9);
      const message = "Finished, closing connection";
      await appendMessage(`${start} [${d}] ${message}`, "dark-green", divId);
      socket.disconnect();
      let event = data.action !== "created" ? "socket.closed" : "subscription.created";
      window.dispatchEvent(
        new CustomEvent(event, {
          bubbles: true,
          detail: { ...data },
        })
      );
    };
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


