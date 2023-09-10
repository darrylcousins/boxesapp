/**
 * App to show box on date selection, used on vege product pages to show
 * available boxes for that particular product.
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/home-page
 * @requires @bikeshaving/crank
 * @listens DOMContentLoaded
 */
import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";

import { Fetch, PostFetch } from "../lib/fetch";
import Error from "../lib/error";
import SelectMenu from "../lib/select-menu";
import CollapseWrapper from "../lib/collapse-animator";
import { containerDateSelectEvent } from "../lib/events";
import {
  animationOptions,
  animateFadeForAction,
  getSetting,
  wrapperStyle,
} from "../../helpers";

/**
 * @param {object} props.selectedProduct object To pass down the addOn product to get to
 * @param {object} props.cartBox object The cart box from page cart json
 * submitCart
 */
function* BoxSelect ({box, boxes, dates, title, cartBox, boxInCart, cartAddons, idx, initialProducts, selectedProduct}) {

  /**
   * The selected date after user select, one of fetchJson.keys
   * If this box is in the cart then we can set this here
   *
   * @member selectedDate
   * @type {string}
   */
  let selectedDate = null;
  if (cartBox) {
    selectedDate = cartBox.delivered;
  }
  /**
   * Included products - box products after date selected
   *
   * @member includedProducts
   * @type {object}
   */
  let includedProducts = initialProducts;
  /**
   * The start date on load, the first of fetchJson.keys
   *
   * @member startDate
   * @type {string}
   */
  let startDate;
  /**
   * Display date selection menu if active
   *
   * @member menuSelectDate
   * @type {boolean}
   */
  let menuSelectDate= false;
  /**
   * Display buttons
   *
   * @member showButtons
   * @type {boolean}
   */
  let showButtons = Boolean(cartBox);
  /**
   * Display popup warning on adding to cart
   *
   * @member showWarningPopup
   * @type {boolean}
   */
  let showWarningPopup = false;

  /**
   * Listen for selection on BoxSelects
   */
  const dateSelectedAction = (ev) => {
    if (ev.detail.boxId === box.id) {
      document.querySelectorAll("[id^=includedProducts]").forEach(el => {
        if (parseInt(el.id.split('-')[1], 10) !== parseInt(box.id, 10)) {
          el.dispatchEvent(containerDateSelectEvent(box.id, idx));
        }
      });
    } else if (showButtons && !cartBox) {
      animateFadeForAction(`includedProducts-${ev.detail.boxId}-${ev.detail.idx}`, async () => {
        showButtons = false;
        await this.refresh();
      });
    };
    //ev.stopPropagation();
  };
  this.addEventListener("containerDateSelectEvent", dateSelectedAction);

  /**
   * Handle mouse up on selected components
   *
   * @function handleMouseUp
   * @param {object} ev The firing event
   * @listens click
   */
  const handleMouseUp = (ev) => {
    if (ev.target.tagName === "BUTTON") {

      switch(ev.target.id) {
        case `selectDate${box.id}`:
          menuSelectDate = !menuSelectDate;
          this.refresh()
          if (!showButtons) {
            showButtons = true;
            this.dispatchEvent(containerDateSelectEvent(box.id, idx));
          }
          break;
      }

    } else if (ev.target.tagName === "DIV") {

      switch(ev.target.getAttribute("name")) {
        case `selectDate${box.id}`:
          const date = ev.target.getAttribute("data-item");
          if (date === selectedDate) break;
          selectedDate = date;
          startDate = null;
          showButtons = true;
          this.dispatchEvent(containerDateSelectEvent(box.id, idx));

          animateFadeForAction(`includedProducts-${box.id}-${idx}`, async () => {
            includedProducts = boxes[selectedDate].includedProducts;
            menuSelectDate = false;
            await this.refresh();
          });
          break;
      }
    }
  };

  this.addEventListener("mouseup", handleMouseUp);

  /**
   * Close display clicked - hide buttons and products
   *
   * @function closeDisplay
   */
  const closeDisplay = () => {
    animateFadeForAction(`includedProducts-${box.id}-${idx}`, async () => {
      showButtons = false;
      selectedDate = null;
      if (selectedProduct) includedProducts = [];
      await this.refresh();
    });
  };

  /**
   * Customize box clicked - reload page to box product
   *
   * @function customizeBox
   */
  const customizeBox = () => {

    // if the box is in the cart then no need for parameters
    if (cartBox) return window.location = box.url;

    let search = `ts=${Date.parse(selectedDate)}`;

    // if the product in included in the box then same but with the date
    if (idx.includes("includes")) {
      return window.location = `${box.url}?${search}`;
    }

    // otherwise we're putting the product in the box
    if (selectedProduct) {
      search += `&aop=${selectedProduct.id}`;
    };
    window.location = `${box.url}?${search}`;
  };

  function *IncludedProducts({ includedProducts, addOnProducts }) {

    const foregroundColour = getSetting("Colour", "included-product-fg");
    const foregroundColourHi = getSetting("Colour", "included-product-fg-hi");
    const backgroundColour = getSetting("Colour", "included-product-bg");

    const getColour = (el) => {
      return selectedProduct.title === el.shopify_title ? foregroundColourHi : foregroundColour;
    };

    const getQuantity = (item) => {
      let found;
      if (idx.includes("addons")) {
        found = cartAddons.find(el => el.product_id === item.product_id); 
        if (found) {
          return `(${item.quantity})`;
        };
      } else if (idx.includes("includes")) {
        found = cartAddons.find(el => el.product_id === item.shopify_product_id); 
        if (found) {
          return `(${found.quantity + 1})`;
        };
      };
      return null;
    };

    for (const { includedProducts, addOnProducts } of this) {
      yield (
        <div class="pill-wrapper" name="noChildren">
          { includedProducts.map(el => (
            <a
              href={`/products/${el.shopify_handle}`}
              class="pill link product"
              title={ `Go to ${el.shopify_title}` }
              style={{
                "color": getColour(el),
                "background-color": backgroundColour,
                "border-color": backgroundColour,
              }}
            >
                { el.shopify_title } { getQuantity(el) }
            </a>
          ))}
          { addOnProducts.map(el => (
              <div
                class="pill pointer"
                style={{
                  "color": getSetting("Colour", `available-product-fg`),
                  "background-color": getSetting("Colour", `available-product-bg`),
                  "border-color": getSetting("Colour", `available-product-bg`)
                }}
                title={el.title}
              >
                { el.title } { getQuantity(el) }
              </div>
          ))}
        </div>
      );
    };
  };

  const IncludedProductsWrapped = CollapseWrapper(IncludedProducts);

  // if any already in the cart
  let addOnProducts = [];

  const makeAddOnProducts = () => {
    const includedIds = includedProducts.map(el => el.shopify_product_id);
    const addOnIds = boxes[selectedDate].addOnProducts.map(el => selectedProduct.id);
    // not an included product
    addOnProducts = cartAddons.filter(el => !includedIds.includes(el.product_id));
    // but added
    addOnProducts = addOnProducts.filter(el => addOnIds.includes(el.product_id));
    return addOnProducts;
  };

  const isAddOn = () => {
    return addOnProducts.length > 0;
  };

  if (cartBox) {
    this.schedule(() => {
      setTimeout(() => { // helps to keep things smooth on load
        includedProducts = boxes[selectedDate].includedProducts;
        if (idx.includes("addons")) {
          makeAddOnProducts();
        };
        menuSelectDate = false;
        this.refresh();
      }, 500);
    });
  };

  // just provide a list of links to the box for now
  // note that the boxes here are lists  by delivery date
  for ({box, boxes, dates, title, initialProducts, idx} of this) {
    yield (
      <Fragment>
        <div style="margin-left: 2em">
          <div>{ box.title }</div>
          <ul>
           { dates.map((el) => (
              <li>
                <a class="link" href={ `/products/${box.handle}?ts=${Date.parse(el)}` }>{ el }</a>
              </li>
            ))}
          </ul>
        </div>
      </Fragment>
    );
  };

  /*
  for ({box, boxes, dates, title, initialProducts, idx} of this) {
    yield (
      <Fragment>
        { showButtons && selectedProduct && (
          <div style={ { ...wrapperStyle, "margin-top": cartBox ? "2em" : "0.5em" } }>
            <div class="ma1">
              <span class="b">{ box.title } </span>
              <span class="b fr">{ selectedDate }</span>
            </div>
          </div>
        )}

        { !includedProducts.length && (
          dates.length ? (
            `${!selectedProduct ? "Build a custom box with your favourite products" : ""}`
          ) : (
            <div>No boxes scheduled for delivery, we will post next week's boxes shortly. Please try again later.</div>
          )
        )}

        <div>
          { cartBox ? (
            <div class="w-100">
              <p
                class="w-100 pointer"
                title="View cart"
                onclick={() => window.location = "/cart"}>
                <strong style="color: #666;">This { 
                  isAddOn() ? "box" : "product"
                } is in your {
                  isAddOn() ? "cart" : "box"
                } for delivery on { cartBox.delivered }</strong>
              </p>
            </div>
          ) : (
            <div class="relative">
              <SelectMenu
                id={`selectDate${box.id}`}
                menu={dates.map(el => ({text: el, item: el}))}
                title="Select delivery date"
                active={menuSelectDate}
                style="margin-top: 1em"
              >
                { selectedDate ? selectedDate : title }&nbsp;&nbsp;&nbsp;{ menuSelectDate ? "▴" : "▾" }
              </SelectMenu>
            </div>
          )}
        </div>
        <IncludedProductsWrapped
          id={`includedProducts-${box.id}-${idx}`}
          collapsed={!(includedProducts.length && dates.length)}
          includedProducts={includedProducts}
          addOnProducts={addOnProducts}
        />
        <div>
          { selectedDate && showButtons && (
            <Fragment>
              <div class="w-100 button-wrapper" style="display: flex; margin-bottom: 1em;">
                { cartBox ? (
                  <Fragment>
                    <div class="button-wrap">
                      <button
                        type="button"
                        name="customize"
                        aria-label="Customize box"
                        title="Customize box"
                        onclick={customizeBox}
                        style={{
                          color: getSetting("Colour", "button-foreground"),
                          "background-color": getSetting("Colour", "button-background"),
                          "border-color": getSetting("Colour", "button-background"),
                          }}
                      >
                        { idx.includes("addons") && !cartAddons.find(el => el.product_id === selectedProduct.id)  ?
                            `Add ${selectedProduct.title} to box` :
                            "Edit box" }
                      </button>
                    </div>
                    <div class="button-wrap">
                      <button
                        type="button"
                        name="view"
                        id="view-button"
                        aria-label="View cart"
                        title="View cart"
                        data-add-to-cart=""
                        onclick={() => window.location = "/cart"}
                        style={{
                          color: getSetting("Colour", "button-foreground"),
                          "background-color": getSetting("Colour", "button-background"),
                          "border-color": getSetting("Colour", "button-background"),
                          }}
                      >
                          View cart
                      </button>
                    </div>
                  </Fragment>
                ) : (
                  <Fragment>
                    <div class="button-wrap">
                      <button
                        type="button"
                        name="add"
                        aria-label="Add to box"
                        title="Add to box"
                        onclick={customizeBox}
                        style={{
                          color: getSetting("Colour", "button-foreground"),
                          "background-color": getSetting("Colour", "button-background"),
                          "border-color": getSetting("Colour", "button-background"),
                          }}
                        >
                        { idx.includes("addons") ?
                              `Add ${selectedProduct.title} to box` :
                              "Edit box" }
                      </button>
                    </div>
                  </Fragment>
                )}
                { !cartBox && (
                  <div class="button-wrap">
                    <button
                      type="button"
                      name="close"
                      aria-label="Close"
                      title="Close"
                      onclick={closeDisplay}
                      style={{
                        color: getSetting("Colour", "button-foreground"),
                        "background-color": getSetting("Colour", "button-background"),
                        "border-color": getSetting("Colour", "button-background"),
                        }}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </Fragment>
          )}
        </div>
      </Fragment>
    );
  };
*/
}

export default BoxSelect;
