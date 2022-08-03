/**
 * The box produst component used by container-box
 * Exported wrapped in animation wrapper
 *
 * @module app/components/container/box-products
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import CollapseWrapper from "../collapse-animator";
import { moveProductEvent } from "../events";
import { getPrice, animateFadeForAction, hasOwnProp, getSetting } from "./../../helpers";

/**
 * Box products display, shows included as well as excluded items and addons
 *
 * @yields {Element} DOM component
 */

function* BoxProducts({selectedIncludes, selectedAddons, selectedExcludes, selectedSwaps}) {

  /**
   * Handle mouse up on selected components
   *
   * @function handleMouseUp
   * @param {object} ev The firing event
   * @listens click
   */
  const handleMouseUp = (ev) => {
    let id;
    if (ev.target.tagName === "DIV") {
      switch(ev.target.getAttribute("name")) {
        case "selectedAddons":
          id = ev.target.getAttribute("data-item");
          animateFadeForAction(ev.target, async () => {
            await this.dispatchEvent(moveProductEvent(id, "selectedAddons", "possibleAddons"));
          });
          break;
        case "selectedExcludes":
          id = ev.target.getAttribute("data-item");
          animateFadeForAction(ev.target, async () => {
            await this.dispatchEvent(moveProductEvent(id, "selectedExcludes", "selectedIncludes"));
          });
          break;
        case "selectedSwaps":
          id = ev.target.getAttribute("data-item");
          animateFadeForAction(ev.target, async () => {
            await this.dispatchEvent(moveProductEvent(id, "selectedSwaps", "possibleAddons"));
          });
          break;
      }
    }
  };
  this.addEventListener("mouseup", handleMouseUp);

  for ({selectedIncludes, selectedAddons, selectedExcludes, selectedSwaps} of this) {
  
    yield (
      <div id="defaultBox" class="">
        <div class="listing-title">
          {getSetting("Translation", "included-products-title")}
        </div>
        <div class="pill-wrapper">
          { !selectedIncludes.length ? (
              <div>Build your own box with available products.</div>
          ) : (
           selectedIncludes.map(el => 
            <div
              class="pill"
              style={{
                "color": el.quantity > 1 ? getSetting("Colour", "included-product-fg-hi") : getSetting("Colour", "included-product-fg"),
                "background-color": getSetting("Colour", "included-product-bg"),
                "border-color": getSetting("Colour", "included-product-bg")
              }}
            >
              {el.shopify_title}
              { el.quantity > 1 && (
                <span>
                  &nbsp;({el.quantity}) {getPrice(el, true)}
                </span>
              )}
            </div>
          ))}
          {selectedAddons.map(el => 
            <div
              class="pill"
              style={{
                "color": el.quantity > 1 ? getSetting("Colour", "available-product-fg-hi") : getSetting("Colour", "available-product-fg"),
                "background-color": getSetting("Colour", "available-product-bg"),
                "border-color": getSetting("Colour", "available-product-bg")
              }}
            >
                {el.shopify_title} ({el.quantity}) {getPrice(el)}
              <div class="dib pointer"
                name="selectedAddons"
                data-item={el.shopify_product_id}
                data-title={el.shopify_title}
                style={{"padding-left": "4px"}}>
                  &#x2715;
              </div>
            </div>
          )}
          {selectedSwaps.map(el => 
            <div
              class="pill"
              style={{
                "color": el.quantity > 1 ? getSetting("Colour", "excluded-product-fg-hi") : getSetting("Colour", "excluded-product-fg"),
                "background-color": getSetting("Colour", "excluded-product-bg"),
                "border-color": getSetting("Colour", "excluded-product-bg")
              }}
            >
              {el.shopify_title}
              { el.quantity > 1 && (
                <span>
                  &nbsp;({el.quantity}) {getPrice(el, true)}
                </span>
              )}
              <div class="dib pointer"
                name="selectedSwaps"
                data-item={el.shopify_product_id}
                data-title={el.shopify_title}
                style={{"padding-left": "4px"}}>
                  &#x2715;
              </div>
            </div>
          )}
        </div>

        { selectedExcludes.length > 0 ? (
          <div name="hasChildren" style="clear:both;">
            <div class="listing-title">
              {getSetting("Translation", "excluded-products-title")}
            </div>
            <div>
              Two items only from your box can be substituted
            </div>
            <div class="pill-wrapper">
              {selectedExcludes.map(el =>
                <div
                  class="pill"
                  style={{
                    "color": getSetting("Colour", "excluded-product-fg"),
                    "background-color": getSetting("Colour", "excluded-product-bg"),
                    "border-color": getSetting("Colour", "excluded-product-bg")
                  }}
                >
                  {el.shopify_title}
                  <div class="dib pointer"
                    name="selectedExcludes"
                    data-item={el.shopify_product_id}
                    data-title={el.shopify_title}
                    style={{"padding-left": "4px"}}>
                      &#x2715;
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : ""}
      </div>
    )
  }
};


export default CollapseWrapper(BoxProducts);
