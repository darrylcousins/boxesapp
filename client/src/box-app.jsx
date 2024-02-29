/**
 * Starting  point of the box app.
 * Renders [crank]{@link https://www.npmjs.com/@b9g/crank} elements
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/box-app
 * @requires @b9g/crank
 * @listens DOMContentLoaded
 */
import { createElement } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";
import ContainerBoxApp from "./components/container-box";
import ProductBoxApp from "./components/product-box";
import { Fetch } from "./components/lib/fetch";
import baseUrl from "./base-url";

const Error = () => (
  <div  style="background-color:khaki; padding: 10px;border:1px;margin-bottom:1em">
    We are unable to load the boxes at the moment, please try again later.
  </div>
);

const init = async ({ productJson, cartJson }) => {
  /**
   * Populate script tag in template with box settings
   */
  try {
    const settingsData = document.querySelector("#box-settings-json");
    const settingsJson = await Fetch(
        `${baseUrl}settings-for-app`
      ).then(({ error, json }) => {
        // handle error
        if (error) {
          return false;
        } else {
          if (json.hasOwnProperty("error")) return false;
          return json;
        }
      });
    if (!settingsJson) {
      // assume that server is inaccessible and abort loading
      return await renderer.render(
        <Error />,
        document.querySelector("div#boxesapp")
      );
    };

    settingsData.textContent = JSON.stringify(settingsJson, null, 2);

    /**
     * Populate script tag in template with box rules
     */
    const rulesData = document.querySelector("#box-rules-json");
    const rulesJson = await Fetch(
        `${baseUrl}box-rules-for-app`
      ).then(({ error, json }) => {
        // handle error
        return json;
      });
    rulesData.textContent = JSON.stringify(rulesJson, null, 2);

    if (productJson.type === "Container Box") {
      return await renderer.render(
        <ContainerBoxApp productJson={productJson} cartJson={cartJson} />, document.querySelector("#boxesapp")
      );
    } else if (productJson.type === "Box Produce") {
      return await renderer.render(
        <ProductBoxApp productJson={productJson} cartJson={cartJson} />, document.querySelector("#boxesapp")
      );
    };
  } catch(err) {
    console.log(`${err.name}: ${err.message}`);
    console.warn(err.message);
    console.error(err);
    return await renderer.render(
      <Error />,
      document.querySelector("div#boxesapp")
    );
  };
};

export default { init };
