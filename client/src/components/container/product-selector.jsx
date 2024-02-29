/**
 * The box produst component used by container-box
 * Exported wrapped in animation wrapper
 *
 * @module app/components/container/dateSelector
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import CollapseWrapper from "../lib/collapse-animator";
import { moveProductEvent, selectorOpenEvent } from "../lib/events";
import { 
  getPrice,
  animationOptions,
  hasOwnProp,
  getSetting,
  animateFadeForAction,
  sortObjectByKeys
} from "./../../helpers";
import ProductAddons from "./product-addons";
import ProductListing from "./product-listing";
import SwapSelector from "./swap-selector";

/**
 * Box products display, shows included as well as excluded items and addons
 *
 * @yields {Element} DOM component
 */
function* ProductSelector({selectedIncludes, possibleAddons, selectedExcludes}) {

  /**
   * Display remove item selection menu if active
   *
   * @member removeItemOpen
   * @type {boolean}
   */
  let removeItemOpen = false;
  /**
   * Display add item selection menu if active
   *
   * @member addItemOpen
   * @type {boolean}
   */
  let addItemOpen = false;
  /**
   * Display swap selector
   *
   * @member swapSelector
   * @type {boolean}
   */
  let swapSelector = false;
  /**
   * Available swaps when removing items
   *
   * @member possibleSwaps
   * @type {boolean}
   */
  let possibleSwaps = [];
  /**
   * The item being removed/swapped out
   *
   * @member removedItem
   * @type {boolean}
   */
  let removedItem = null;
  /** 
   * Map strings to the lists
   *
   * @function listMap
   */
  const listMap = (str) => {
    let list;
    switch(str) {
      case 'possibleAddons':
        list = possibleAddons;
        break;
      case 'selectedIncludes':
        list = selectedIncludes;
        break;
    }
    return list;
  }
  /**
   * Handle mouse up on selected components
   *
   * @function handleMouseUp
   * @param {object} ev The firing event
   * @listens click
   */
  const handleMouseUp = async (ev) => {
    let id;
    if (ev.target.tagName === "BUTTON") {
      switch(ev.target.id) {
        case "addItem":
          this.dispatchEvent(selectorOpenEvent("addItem"));
          break;
        case "removeItem":
          this.dispatchEvent(selectorOpenEvent("removeItem"));
          break;
      }
    } else if (ev.target.tagName === "DIV") {
      switch(ev.target.getAttribute("name")) {
        case "addItem":
          /* XXX my preference is to close the list - overruled by Streamside */
          //this.dispatchEvent(selectorOpenEvent(null));
          id = ev.target.getAttribute("data-item");
          animateFadeForAction(ev.target, async () => {
            await this.dispatchEvent(moveProductEvent(id, "possibleAddons", "selectedAddons"));
          });
          break;
        case "removeItem":

          id = ev.target.getAttribute("data-item");

          let swaps = [];

          // for swaps, if removing from selectedSwaps back to includedProducts, then
          // we must also put back the excludeProduct Biggest worry here is how to
          // identify *which* was swapped out when excludedProducts.length > 1
          // find list of similar-priced items from the possibleAddons
          const product = listMap("selectedIncludes").find(el => el.shopify_product_id === parseInt(id));
          swaps = listMap("possibleAddons").filter(el => {
              if (el.shopify_tag === product.shopify_tag) {
                return ((product.shopify_price - 50 <= el.shopify_price) && (el.shopify_price <= product.shopify_price + 50));
              } else {
                return false;
              };
            });
          if (swaps.length === 0) {
            possibleSwaps = [];
          } else {
            // need to pause things here to allow user to select one of the possible swaps
            // in the move above a product has moved from selectedIncludes to selectedExcludes
            // now we ask the use to move a similarly priced product from possibleAddons to selectedSwaps
            possibleSwaps = [...swaps];
          };

          removedItem = { ...product };
          swapSelector = true;

          const overlay = document.querySelector("#productSelectorOverlay");
          overlay.style.visibility = "visible";
          const animation = overlay.animate({
            opacity: 0.9,
          }, animationOptions);
          this.refresh();

          break;
        case "possibleAddons":
          id = ev.target.getAttribute("data-item");
          animateFadeForAction(ev.target, async () => {
            await this.dispatchEvent(moveProductEvent(id, "possibleAddons", "selectedAddons"));
          });
          break;
      }
    }
  };
  this.addEventListener("mouseup", handleMouseUp);

  /**
   * Handle selector open event, if matching selectorId the menu is open, else close
   * Also need to be nulling the removedItem and closing swapSelector
   *
   * @function handleSelectorOpen
   * @param {object} ev The firing event
   * @listens selectorOpenEvent
   */
  const handleSelectorOpen = async (ev) => {
    if ("addItem" === ev.detail.selector) {
      addItemOpen = !addItemOpen;
      removeItemOpen = false;
    } else if ("removeItem" === ev.detail.selector) {
      removeItemOpen = !removeItemOpen;
      addItemOpen = false;
    } else {
      addItemOpen = false;
      removeItemOpen = false;
    };
    removedItem = null;
    possibleSwaps = [];
    swapSelector = false;
    await this.refresh();
  };

  this.addEventListener("selectorOpenEvent", handleSelectorOpen)

  /**
   * Confirm swap - onclick of product item in swap modal
   *
   * @function confirmSwap
   */
  const confirmSwap = async (product) => {

    const removed = { ...removedItem };
    removedItem = null;
    possibleSwaps = [];
    swapSelector = false;

    this.dispatchEvent(selectorOpenEvent(null));

    // I assume this refresh is called here along the way?
    await this.dispatchEvent(moveProductEvent(removed.shopify_product_id, "selectedIncludes", "selectedExcludes"));
    await this.dispatchEvent(moveProductEvent(product.shopify_product_id, "possibleAddons", "selectedSwaps"));
  };

  /**
   * Cancel swap - onclick of cancel button in swap modal
   *
   * @function cancelSwap
   */
  const cancelSwap = async () => {
    removedItem = null;
    possibleSwaps = [];
    swapSelector = false;
    await this.refresh();
  };

  for ({selectedIncludes, possibleAddons, selectedExcludes} of this) {

    yield (
      <div id="productSelector" class="">
        <div id="productSelectorOverlay"></div>
        <div>

          { selectedIncludes.length > 0 && (
            <Fragment>
              { selectedExcludes.length < 2 && (
                <Fragment>
                  { !removeItemOpen ? (
                    <button
                      class="select-dropdown-button"
                      title="Remove items from your box"
                      id="removeItem"
                      type="button"
                      >
                      {getSetting("Translation", "select-excludes")}&nbsp;&nbsp;&nbsp;▾
                    </button>
                  ) : (
                    <button
                      class="select-dropdown-button"
                      title="Cancel"
                      id="removeItem"
                      type="button"
                      >
                      Done&nbsp;&nbsp;&nbsp;▴
                    </button>
                  )}
                  <SwapSelector
                    possibleSwaps={ possibleSwaps }
                    removedItem={ removedItem }
                    confirmSwap={ confirmSwap }
                    cancelSwap={ cancelSwap }
                    collapsed={ !(swapSelector && removedItem && !addItemOpen && removeItemOpen) }
                    id="swap-selector"
                  />
                  <ProductListing
                    possibleProducts={selectedIncludes}
                    name="removeItem"
                    title="Remove product from your box"
                    type="excluded"
                    collapsed={!removeItemOpen}
                    id="product-includes"
                  />
                </Fragment>
              )}
            </Fragment>
          )}

          { (possibleAddons.length > 0) && (
            <Fragment>
              { !addItemOpen ? (
                <button
                  class="select-dropdown-button"
                  title="Add items to your box"
                  id="addItem"
                  type="button"
                  >
                  {getSetting("Translation", "select-addons")}&nbsp;&nbsp;&nbsp;▾
                </button>
              ) : (
                <button
                  class="select-dropdown-button"
                  title="Cancel"
                  id="addItem"
                  type="button"
                  >
                  Done&nbsp;&nbsp;&nbsp;▴
                </button>
              )}
              <ProductListing
                possibleProducts={possibleAddons}
                name="addItem"
                title="Add product to your box"
                type="available"
                collapsed={!addItemOpen}
                id="product-addons"
              />
            </Fragment>
          )}

        </div>

      </div>
    )
  }
};

export default ProductSelector;
