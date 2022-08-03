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
import "regenerator-runtime/runtime"; // regeneratorRuntime error
import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";

import AddToCartButton from "./add-button.js";
import TextButton from "./text-button.js";
import BarLoader from "./bar-loader.js";
import BoxSelect from "./box-select.js";
import ProductDescription from "./product-description.js";
import QuantityForm from "./container/quantity-form.js";
import IncludedProducts from "./container/included-products";
import SelectMenu from "./select-menu";
import Flash from "./flash";
import IconCart from "./icon-cart";
import { Fetch } from "./fetch";
import { shallowEqual } from "../lib";
import { hasOwnProp } from "../helpers";
import Boxes from "./container/produce-boxes";

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
   * Base url to api
   *
   * @member baseUrl
   * @type {string}
   */
  const baseUrl = _baseUrl;
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
   * Gather box includes for display, watch for dates, cart items and date
   * already selected from collection
   *
   * @function init
   */
  const init = async () => {
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
            }
          }
        }
        if (Object.keys(json).length > 0) {
          fetchBoxes = Object.keys(json);
          fetchJson = json;
          Object.entries(fetchJson).forEach(([handle, byDeliveryDate]) => {
            byDeliveryDate.forEach(box => {
              if (box.shopify_product_id === cartBoxId && box.delivered === inCartWithDate) {
                cartBox = box;
              }
              if (box.addOnProduct) {
                if (!hasOwnProp.call(addOns, handle)) {
                  addOns[handle] = [];
                }
                addOns[handle].push(box);
              }
              if (box.includedProduct) {
                if (!hasOwnProp.call(includes, handle)) {
                  includes[handle] = [];
                }
                includes[handle].push(box);
              }
            });
          });
        }
      }
      loading = false;
      this.refresh();
    });
  };

  await init();  // set up script

  for await ({ productJson } of this) {
    yield (
      <div class="mt1">
        { fetchError && <Error msg={fetchError} /> }
        { !loading ? (
          <Fragment>
            { Object.keys(includes).length > 0 ? (
              <Fragment>
                <h4 class="mb0">Included in the boxes:</h4>
                <Boxes boxes={includes} selectedProduct={productJson} cartBox={cartBox} boxInCart={Boolean(cartBoxId)} />
              </Fragment>
            ) : (
              <Fragment>
                <h4 class="mb0">Included in the boxes:</h4>
                <p>Not a regular item in any box this week.</p>
              </Fragment>
            )}
            { Object.keys(addOns).length > 0 ? (
              <Fragment>
                <h4 class="mb0">Add on product to:</h4>
                <Boxes boxes={addOns} selectedProduct={productJson} cartBox={cartBox} boxInCart={Boolean(cartBoxId)} />
              </Fragment>
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