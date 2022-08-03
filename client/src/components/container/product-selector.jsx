/**
 * The box produst component used by container-box
 * Exported wrapped in animation wrapper
 *
 * @module app/components/container/dateSelector
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import CollapseWrapper from "../collapse-animator";
import { moveProductEvent, selectorOpenEvent } from "../events";
import SelectMenu from "../select-menu";
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
   * Selector id for add item select menu
   *
   * @member addItemId
   * @type {string}
   */
  const addItemId = "addItem";
  /**
   * Selector id for remove item select menu
   *
   * @member removeItemId
   * @type {string}
   */
  const removeItemId = "removeItem";
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
        case addItemId:
          this.dispatchEvent(selectorOpenEvent(addItemId));
          break;
        case removeItemId:
          this.dispatchEvent(selectorOpenEvent(removeItemId));
          break;
      }
    } else if (ev.target.tagName === "DIV") {
      switch(ev.target.getAttribute("name")) {
        case addItemId:
          /* XXX my preference is to close the list - overruled by Streamside */
          //this.dispatchEvent(selectorOpenEvent(null));
          id = ev.target.getAttribute("data-item");
          animateFadeForAction(ev.target, async () => {
            await this.dispatchEvent(moveProductEvent(id, "possibleAddons", "selectedAddons"));
          });
          break;
        case removeItemId:

          id = ev.target.getAttribute("data-item");

          let swaps = [];

          // for swaps, if removing from selectedSwaps back to includedProducts, then
          // we must also put back the excludeProduct Biggest worry here is how to
          // identify *which* was swapped out when excludedProducts.length > 1
          //
          // find list of similar-priced items from the possibleAddons
          const product = listMap("selectedIncludes").find(el => el.shopify_product_id === parseInt(id));
          swaps = listMap("possibleAddons").filter(el => {
              if (el.shopify_tag === product.shopify_tag) {
                return ((product.shopify_price - 50 <= el.shopify_price) && (el.shopify_price <= product.shopify_price + 50));
              } else {
                return false;
              };
            });
          if (swaps.length) {
            // need to pause things here to allow user to select one of the possible swaps
            // in the move above a product has moved from selectedIncludes to selectedExcludes
            // now we ask the use to move a similarly priced product from possibleAddons to selectedSwaps
            removedItem = { ...product };
            possibleSwaps = [...swaps];
            swapSelector = true;

            const overlay = document.querySelector("#productSelectorOverlay");
            overlay.style.visibility = "visible";
            const animation = overlay.animate({
              opacity: 0.9,
            }, animationOptions);
            this.refresh();

          } else {
            // no swapsfollow original script
            this.dispatchEvent(selectorOpenEvent(null));
            animateFadeForAction(ev.target, async () => {
              await this.dispatchEvent(moveProductEvent(id, "selectedIncludes", "selectedExcludes"));
            });
          };
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
   * Confirm swap - onclick of product item in swap modal
   *
   * @function confirmSwap
   */
  const confirmSwap = async (product) => {
    console.log('swapping in: ', product);
    const removed = { ...removedItem };
    removedItem = null;
    possibleSwaps = [];
    swapSelector = false;

    const overlay = document.querySelector("#productSelectorOverlay");
    const animation = overlay.animate({
      opacity: 0
    }, animationOptions);
    animation.addEventListener("finish", () => {
      overlay.style.visibility = "hidden";
      this.refresh();
    });

    this.dispatchEvent(selectorOpenEvent(null));

    /*
    animateFadeForAction(ev.target, async () => {
      await this.dispatchEvent(moveProductEvent(id, "selectedIncludes", "selectedExcludes"));
    });
    */
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

    const overlay = document.querySelector("#productSelectorOverlay");
    const animation = overlay.animate({
      opacity: 0
    }, animationOptions);
    this.refresh();
    animation.addEventListener("finish", () => {
      overlay.style.visibility = "hidden";
    });
  };

  /**
   * Handle selector open event, if matching selectorId the menu is open, else close
   *
   * @function handleSelectorOpen
   * @param {object} ev The firing event
   * @listens selectorOpenEvent
   */
  const handleSelectorOpen = (ev) => {
    if (addItemId === ev.detail.selector) {
      addItemOpen = !addItemOpen;
      removeItemOpen = false;
    } else if (removeItemId === ev.detail.selector) {
      removeItemOpen = !removeItemOpen;
      addItemOpen = false;
    } else {
      addItemOpen = false;
      removeItemOpen = false;
    }
    this.refresh();
  };
  this.addEventListener("selectorOpenEvent", handleSelectorOpen)

  for ({selectedIncludes, possibleAddons, selectedExcludes} of this) {

    yield (
      <div id="productSelector" class="">
        <div id="productSelectorOverlay" class="overlay"></div>
        <div>

          { (selectedIncludes.length > 0) && (
            <Fragment>
              { swapSelector && (
                <div class="relative">
                  <div id="swapSelectorModal">
                    <div style="font-size:1em;font-weight:bold;padding:0.3em 0.5em;color:dark-grey;">
                      <div>Removing <span style="color: black">{ removedItem.shopify_title }</span>.</div>
                      <div class="tr">To continue please select a replacement.</div>
                    </div>
                    <div class="pill-wrapper">
                      {possibleSwaps.map(el =>
                        <div
                          class="pill"
                          style={{
                            "color": getSetting("Colour", "excluded-product-fg"),
                            "background-color": getSetting("Colour", "excluded-product-bg"),
                            "border-color": getSetting("Colour", "excluded-product-bg"),
                            "cursor": "pointer",
                          }}
                          onclick={ () => confirmSwap(el) }
                        >
                          {el.shopify_title}
                        </div>
                      )}
                    </div>
                    <div class="tc button-wrapper">
                      <button
                        name="close"
                        type="button"
                        id="selectSwapClose"
                        title="Cancel"
                        onclick={ cancelSwap }
                        style={{
                          color: getSetting("Colour", "button-foreground"),
                          "background-color": getSetting("Colour", "button-background"),
                          "border-color": getSetting("Colour", "button-background"),
                          "font-size": "0.9em"
                          }}
                        >
                          Cancel
                        </button>
                    </div>
                  </div>
                </div>
              )}
              { selectedExcludes.length < 2 && (
                <Fragment>
                  <button
                    class="select-dropdown-button"
                    title="Remove items to your box"
                    id={removeItemId}
                    type="button"
                    >
                    {getSetting("Translation", "select-excludes")}&nbsp;&nbsp;&nbsp;{ removeItemOpen ? "▴" : "▾" }
                  </button>
                  <ProductListing
                    possibleProducts={selectedIncludes}
                    name="removeItem"
                    title="Remove items from your box"
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
              <button
                class="select-dropdown-button"
                title="Add items to your box"
                id={addItemId}
                type="button"
                >
                {getSetting("Translation", "select-addons")}&nbsp;&nbsp;&nbsp;{ addItemOpen ? "▴" : "▾" }
              </button>
              <ProductListing
                possibleProducts={possibleAddons}
                name="addItem"
                title="Add item to your box"
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
//export default CollapseWrapper(ProductSelector);
