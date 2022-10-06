/**
 * Router and starting  point of the box app.
 * Renders [crank]{@link https://www.npmjs.com/@bikeshaving/crank} elements
 * Imported by app/box-app
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/initialize
 * @requires @bikeshaving/crank
 * @listens DOMContentLoaded
 */
import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";

import BarLoader from "./lib/bar-loader";
import { Fetch } from "./lib/fetch";
import {
  hasOwnProp,
  getSetting
} from "../helpers";
import Boxes from "./product/produce-boxes";

/**
 * BoxApp crank component
 *
 * @generator
 * @param {object} props The property object
 * @param {object} props.productJson Shopify product data as extracted from
 * product page json script tag
 * @yields {Element} A crank DOM component
 */
async function* ProductBoxApp({productJson, cartJson}) {
  /**
   * If fetching data was unsuccessful.
   *
   * @member fetchError
   * @type {object|string|null}
   */
  let fetchError = null;
  /**
   * Contains box data as collected from api/current-boxes-for-box-product,
   * these are the boxes of which this product is either an included product or
   * possible add on.
   *
   * @member fetchJson
   * @type {object}
   */
  let fetchJson = {};
  /**
   * The box ids: Object.keys(fetchJson)
   *
   * @member fetchDates
   * @type {object}
   */
  let fetchBoxes = [];
  /**
   * The boxes to which this product is an add on to.
   *
   * @member addOns
   * @type {object}
   */
  const addOns = {};
  /**
   * The boxes to which this product is included in
   *
   * @member includes
   * @type {object}
   */
  const includes = {};
  /**
   * The boxes as json object keyed by delivery date
   *
   * @member boxesByDate
   * @type {object}
   */
  const boxesByDate = {};
  /**
   * Display loading indicator while fetching data
   *
   * @member loading
   * @type {boolean}
   */
  let loading = true;
  /**
   * The cart price??
   *
   * @member priceElement
   * @type {Element}
   */
  let totalPrice = productJson.variants[0].price;
  /**
   * A box in the cart, depending if it is one of the boxes
   *
   * @member cartBox
   * @type {object}
   */
  let cartBox = null;
  /**
   * Box id in cart - makes boxInCart boolean
   *
   * @member cartBoxId
   * @type {object}
   */
  let cartBoxId = null;
  /**
   * Add on items already in cart
   *
   * @member cartAddons
   * @type {object}
   */
  let cartAddons = [];

  /**
   * Gather box includes for display, watch for dates, cart items and date
   * already selected from collection
   *
   * @function init
   */
  const init = async () => {
    const baseUrl = getSetting("General", "api-url");
    let fetchUrl = `${baseUrl}current-boxes-by-product/${productJson.id}`;
    await Fetch(
      `${baseUrl}current-boxes-for-box-product/${productJson.id}`
    ).then(async ({ error, json }) => {
      if (error) {
        fetchError = error;
      } else {
        let inCartWithDate = null;
        if (cartJson.items && cartJson.items.length) {
          // figure the date and set initialDate and initialProducts
          for (const item of cartJson.items) {
            if (item.product_type === "Container Box") {
              // get the delivery date regardless of which box
              inCartWithDate = item.properties["Delivery Date"];
              cartBoxId = item.product_id;
            } else if (item.product_type === "Box Produce") {
              const { title, product_id, quantity } = item;
              cartAddons.push({
                product_id,
                quantity,
                title
              });
            };
          };
        };
        if (Object.keys(json).length > 0) {
          fetchBoxes = Object.keys(json);
          fetchJson = json;
          console.log(fetchJson);
          Object.entries(fetchJson).forEach(([handle, byDeliveryDate]) => {
            byDeliveryDate.forEach(box => {
              if (box.shopify_product_id === cartBoxId && box.delivered === inCartWithDate) {
                cartBox = box;
              };
              if (box.addOnProduct) {
                if (!hasOwnProp.call(addOns, handle)) {
                  addOns[handle] = [];
                };
                addOns[handle].push(box);
              };
              if (box.includedProduct) {
                if (!hasOwnProp.call(includes, handle)) {
                  includes[handle] = [];
                };
                includes[handle].push(box);
              };
            });
          });
        };
      };
      loading = false;
      this.refresh();
    });
  };

  await init();  // set up script

  const title = {
    "border-style": "solid",
    "border-color": "silver",
    "border-width": "0px 0px 1px 0px",
  };

  for await ({ productJson } of this) {
    yield (
      <div class="mt1">
        { fetchError && <Error msg={fetchError} /> }
        { !loading ? (
          <Fragment>
            <div class="listing-title" style={ title }>Included in the boxes:</div>
            { Object.keys(includes).length > 0 ? (
              <Boxes
                type="includes"
                boxList={includes}
                selectedProduct={productJson}
                cartBox={cartBox}
                cartAddons={cartAddons}
                boxInCart={Boolean(cartBoxId)} />
            ) : (
              <p>Not a regular item in any box this week.</p>
            )}
            <div class="listing-title" style={ title }>Add on product to:</div>
            { Object.keys(addOns).length > 0 ? (
              <Boxes
                type="addons"
                boxList={addOns}
                selectedProduct={productJson}
                cartBox={cartBox}
                cartAddons={cartAddons}
                boxInCart={Boolean(cartBoxId)} />
            ) : (
              <p>Not available as an add on product this week</p>
            )}
          </Fragment>
        ) : (
          <BarLoader />
        )}
      </div>
    )
  }
}

export default ProductBoxApp;
