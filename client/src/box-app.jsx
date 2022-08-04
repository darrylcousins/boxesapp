/**
 * Starting  point of the box app.
 * Renders [crank]{@link https://www.npmjs.com/@b9g/crank} elements
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/box-app
 * @requires @b9g/crank
 * @listens DOMContentLoaded
 */
import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";
import ContainerBoxApp from "./components/container-box";
import { Fetch } from "./components/fetch";
import baseUrl from "./base-url";

const init = async () => {
  /**
   * Contains cart data collected from html template json data
   * This will then also contain a selected date
   */
  const cartData = document.querySelector("#cart-json");
  const cartJson = await JSON.parse(cartData.textContent);
  //console.log(JSON.stringify(cartJson.items, null, 2));

  /**
   * Populate script tag with boxes settings
   */
  const settingsData = document.querySelector("#box-settings-json");
  const settingsJson = await Fetch(
      `${baseUrl}settings-for-app`
    ).then(({ error, json }) => {
      // handle error
      if (error) {
        return false;
      } else {
        return json;
      }
    });
  if (!settingsJson) {
    // assume that server is inaccessible and abort loading
    await renderer.render(
      <div style="color: red">Failed to load boxes, please try again later</div>,
      document.querySelector("div[class='product__content-main']")
    );
    return;
  };

  settingsData.textContent = JSON.stringify(settingsJson, null, 2);

  const rulesData = document.querySelector("#box-rules-json");
  const rulesJson = await Fetch(
      `${baseUrl}box-rules-for-app`
    ).then(({ error, json }) => {
      // handle error
      return json;
    });
  rulesData.textContent = JSON.stringify(rulesJson, null, 2);

  /**
   * Each of the collected boxes as presented by theme/snippets/box-product-snippet
   */
  const productJson = await JSON.parse(document.getElementById("product-json").textContent);

  // same if/else used in liquid template but here we are sure
  if (productJson.type === "Container Box") {
    await renderer.render(
      <ContainerBoxApp productJson={productJson} cartJson={cartJson} />, document.querySelector("#app")
    );
  } else {
    return;
  };
};

export default { init };
