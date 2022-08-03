/**
 * App to show box on date selection, used on vege product pages to show
 * available boxes for that particular product.
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/home-page
 * @requires @bikeshaving/crank
 * @listens DOMContentLoaded
 */
import "regenerator-runtime/runtime"; // regeneratorRuntime error
import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";

import { Fetch, PostFetch } from "./fetch";
import Error from "./error";
import BarLoader from "./bar-loader";
import SelectMenu from "./select-menu";
import CollapseWrapper from "./collapse-animator";
import Popup from "./popup";
import { containerDateSelectEvent } from "./events";
import { animationOptions, animateFadeForAction } from "../helpers";

/**
 * @param {object} props.selectedProduct object To pass down the addOn product to get to
 * @param {object} props.cartBox object The cart box from page cart json
 * submitCart
 */
function* BoxSelect ({box, boxes, dates, title, cartBox, boxInCart, initialDate, initialProducts, selectedProduct}) {
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
      document.querySelectorAll("[id$=includedProducts]").forEach(el => {
        if (parseInt(el.id.split('-')[0], 10) !== parseInt(box.id, 10)) {
          el.dispatchEvent(containerDateSelectEvent(box.id));
        }
      });
    } else if (!cartBox && showButtons) {
      animateFadeForAction(`${box.id}-includedProducts`, async () => {
        showButtons = false;
        await this.refresh();
      });
    };
    ev.stopPropagation();
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
            this.dispatchEvent(containerDateSelectEvent(box.id));
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
          this.dispatchEvent(containerDateSelectEvent(box.id));

          animateFadeForAction(`${box.id}-includedProducts`, async () => {
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
    animateFadeForAction(`${box.id}-includedProducts`, async () => {
      showButtons = false;
      selectedDate = null;
      if (selectedProduct) includedProducts = [];
      await this.refresh();
    });
  };

  /**
   * View cart clicked - reload page to cart
   *
   * @function viewCart
   */
  const viewCart = () => {
    const url = "/cart";
    if (typeof window.swup === 'undefined') {
      window.location = url;
    } else {
      window.swup.loadPage({ url });
    }
  };

  /**
   * Customize box clicked - reload page to box product
   *
   * @function customizeBox
   */
  const customizeBox = () => {
    let search = `ts=${Date.parse(selectedDate)}`;
    if (selectedProduct) {
      search += `&aop=${selectedProduct.id}`;
    };
    const url = `${box.url}?${search}`;
    if (typeof window.swup === 'undefined') {
      window.location = url;
    } else {
      window.swup.loadPage({ url });
    }
  };

  /**
   * Show popup and get user confirmation to replace box in cart
   *
   * @function initSubmitCart
   */
  const initSubmitCart = async () => {
    if (boxInCart) {
      showWarningPopup = !showWarningPopup;
      await this.refresh()
      const popup = document.querySelector(`#popup-${box.id}`);
      if (popup) {
        popup.animate({
          opacity: 1
        }, animationOptions);
      }
    } else {
      submitCart()
    }
  };

  const popupCallback = (result) => {
    if (result) {
      submitCart();
      return;
    }
    showWarningPopup = !showWarningPopup;
    this.refresh()
  };

  /**
   * Submit cart data as made up from makeCart - also the callee
   * This is almost the same as for container box!!
   *
   * @function submitCart
   */
  const submitCart = async () => {

    const data = {};
    data.items = [];
    const properties = {
      "Delivery Date": selectedDate,
      "Including": boxes[selectedDate].includedProducts.map(el => el.shopify_title).join(','),
    };

    if (selectedProduct && boxes[selectedDate].addOnProducts.find(el => el.shopify_product_id === selectedProduct.id)) {
      // used for vege product page if an addon product - not in collection
      data.items.push({
        quantity: 1,
        id: selectedProduct.variants[0].id,
        properties: {
          "Delivery Date": selectedDate,
          "Add on product to": boxes[selectedDate].shopify_title
        }
      });
      properties["Add on Items"] = selectedProduct.title;
    }

    data.items.push({
      id: boxes[selectedDate].shopify_variant_id,
      quantity: 1,
      properties,
    });

    const headers = {"Content-Type": "application/json"};
    const {error: clearError, json: clearJson} = await PostFetch({src: "/cart/clear.js", data, headers});

    if (clearError) {
      console.warn(clearError); // what to do here??
      return;
    }

    const src = "/cart/add.js";
    const {error, json} = await PostFetch({src, data, headers});

    const url = "/cart";
    if (typeof window.swup === 'undefined') {
      window.location = url;
    } else {
      window.swup.loadPage({ url });
    }
  };

  function *IncludedProducts({ includedProducts }) {
    for (const { includedProducts } of this) {
      yield (
        includedProducts.map(el => (
          <a
            href={`/products/${el.shopify_handle}`}
            class={
              `link dim pointer o-90 fl ph3 ma1 ba br-pill b--streamside-blue ${
                selectedProduct && selectedProduct.id === el.shopify_product_id ? "bg-debut-yellow black" : "bg-transparent fg-streamside-blue"
              }`
            }
          >
              { el.shopify_title }
          </a>
        ))
      );
    };
  };

  const IncludedProductsWrapped = CollapseWrapper(IncludedProducts);

  for ({box, boxes, dates, title, initialProducts, initialDate} of this) {
    yield (
      <Fragment>
        { showButtons && selectedProduct && (
          <p class="tl ttu tracked fw4 ma0 mt2 pt2 bt">{box.title}</p>
        )}
        <p class="tr ttu tracked f7 fw4 ma0">{selectedDate ? selectedDate : initialDate}</p>

        <div id={`${box.id}-includedProducts`} class={`${includedProducts.length && "mb2"} o-1`}>
          { !includedProducts.length && (
            dates.length ? (
              `${!selectedProduct ? "Build a custom box with your favourite products" : ""}`
            ) : (
              <div>No boxes scheduled for delivery, we will post next week's boxes shortly. Please try again later.</div>
            )
          )}
        </div>
        <IncludedProductsWrapped
          id={`includedProducts-${box.id}`}
          collapsed={!(includedProducts.length && dates.length)}
          includedProducts={includedProducts}
        />
        <div>
          { cartBox ? (
            <div class="w-100 fl">
              <p
                class="mb1 mt2 pa2 ba b--black-50 br2 w-100 pointer"
                title="View cart"
                onclick={viewCart}>
                <strong>This box is in your cart for delivery on { cartBox.delivered }</strong>
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
          { selectedDate && showButtons && (
            <Fragment>
              <div class="w-100">
                { cartBox ? (
                  <button
                    type="button"
                    name="view"
                    aria-label="View cart"
                    title="View cart"
                    class="di ttu w-100 w-50-ns tracked dim outline-0 debut-yellow b--debut-brown ba ba1 bg-debut-brown br2 br--left-ns pa2 mb1 pointer"
                    onclick={viewCart}
                  >
                      View cart
                  </button>
                ) : (
                  <Fragment>
                    <button
                      type="button"
                      name="add"
                      aria-label="Add to cart"
                      title="Add to cart"
                      class="di ttu w-100 w-third-ns tracked dim outline-0 debut-yellow b--debut-brown ba ba1 bg-debut-brown br2 br--left-ns pa2 mb1 pointer"
                      onclick={initSubmitCart}
                    >
                        Add to cart
                    </button>
                    <Popup
                      class="w-third-ns"
                      id={box.id}
                      buttons={true}
                      active={showWarningPopup}
                      callback={popupCallback}
                      text="Are you sure you would like to replace the box already in your cart?" />
                  </Fragment>
                )}
                <button
                  type="button"
                  name="customize"
                  aria-label="Customize box"
                  title="Customize box"
                  class={`di ttu w-100 ${ cartBox ? "w-50-ns" : "w-third-ns" } tracked dim outline-0 debut-yellow b--debut-brown ba ba1 bg-debut-brown br2 br--left-ns br--right-ns pa2 mb1 pointer`}
                  onclick={customizeBox}
                >
                  Customize box
                </button>
                { !cartBox && (
                  <button
                    type="button"
                    name="close"
                    aria-label="Close"
                    title="Close"
                    class="di ttu w-100 w-third-ns tracked dim outline-0 debut-yellow b--debut-brown ba ba1 bg-debut-brown br2 br--right-ns pa2 mb1 pointer"
                    onclick={closeDisplay}
                  >
                    Close
                  </button>
                )}
              </div>
            </Fragment>
          )}
        </div>
      </Fragment>
    );
  };
}

export default BoxSelect;