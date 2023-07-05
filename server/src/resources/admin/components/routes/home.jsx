//import { io } from "socket.io-client";
import { Manager } from "socket.io-client";
import { createElement } from "@b9g/crank";
import { delay } from "../../../../lib/helpers.js";

export default () => {

  const proxy = localStorage.getItem("proxy-path");

  const host = `https://${ window.location.host }`;

  const saveConfirmation = async () => {

    const sessionId = Math.random().toString(36).substr(2, 9);

    const socket = io(host, {
      autoConnect: true, // could also do this with socket.open()
      path: `${proxy}/socket-io`,
      transports: ["polling"], // disable websocket polling - no wss on shopify
    });

    socket.emit('connectInit', sessionId);

    socket.on('uploadProgress', (data) => {
      console.log(data);
      // display data or update timer
    });

    socket.on('finished', (id) => {
      if (id === sessionId) {
        console.log('closing connection for id', id);
        socket.disconnect();
      };
    });

    socket.on('connected', async (id) => {
      if (id === sessionId) {
        console.log('connected with id', id);
      };
    });

    socket.on('connect', async () => {
      console.log("connection opened with id", sessionId);
    });
    socket.on('disconnect', async () => {
      console.log("connection closed with id", sessionId);
    });
  };

  //saveConfirmation();

  return (
    <div class="w-100 pb2 center">
      <div class="pl5 w-100">
        <h4 class="pt0 lh-title ma0 fg-streamside-maroon" id="boxes-title">
          Boxes App
        </h4>
        <div class="pa4">You are at the Boxes App Admin Portal.
          <span class="pl3 dib b">Select an option from the header menu.</span>
        </div>
      </div>
    </div>
  );
};
