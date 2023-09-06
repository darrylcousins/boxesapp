//import { io } from "socket.io-client";
import { Manager } from "socket.io-client";
import { createElement } from "@b9g/crank";
import { delay } from "../../../../lib/helpers.js";

export default () => {

  const proxy = localStorage.getItem("proxy-path");

  const host = `https://${ window.location.host }`;

  return (
    <div class="w-100 pb2">
      <div class="pl5 w-100">
        <h4 class="pt0 lh-title ma0 fg-streamside-maroon" id="boxes-title">
          Boxes App
        </h4>
        <div class="pa4">You are at the Boxes App Admin Portal.
          <span id="getEm" class="pl3 dib b">Select an option from the header menu.</span>
        </div>
      </div>
    </div>
  );
};
