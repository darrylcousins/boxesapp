
import { io } from "socket.io-client";

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
export const getSessionId = async (callback, data) => {
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
  socket.on('message', async (data) => {
    console.log('message', data);
    // display data or update timer
    const socketMessages = document.getElementById("socketMessages");
    if (socketMessages) {
      let message = document.createElement("p");
      message.classList.add("b", "mv1", "pv1", "dark-blue");
      message.textContent = data;
      socketMessages.appendChild(message);
      socketMessages.scrollIntoView({ behavior: "smooth", block: "end" });
    };
  });
  socket.on('progress', async (data) => {
    console.log('progress', data);
    // display data or update timer
    const socketMessages = document.getElementById("socketMessages");
    if (socketMessages) {
      let message = document.createElement("p");
      message.classList.add("b", "mv1", "pv1", "orange");
      message.textContent = data;
      socketMessages.appendChild(message);
    };
  });
  socket.on('finished', async (id) => {
    if (id === session_id) {
      console.log('closing connection for id', id);
      socket.disconnect();
      const socketMessages = document.getElementById("socketMessages");
      if (socketMessages) {
        let message = document.createElement("p");
        message.classList.add("b", "mv1", "pv1", "dark-green");
        message.textContent = "Finished, closing connection";
        socketMessages.appendChild(message);
      };
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


