/**
 * Form for editing quantities
 *
 * @module app/quantity-form
 * @exports {Element} QuantityForm
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import {
  getSetting,
  animateFadeForAction,
} from "../../helpers";
import CollapseWrapper from "../lib/collapse-animator";
import { moveProductEvent, selectorOpenEvent } from "../lib/events";

/**
 * Component to update quantities in box
 *
 * @returns {Element} DOM component
 */
function *SwapSelector({ possibleSwaps, removedItem, confirmSwap, cancelSwap }) {

  for ({possibleSwaps, removedItem} of this) {

    yield (
      <Fragment>
        { removedItem && (
          <Fragment>
            { possibleSwaps.length > 0 ? (
              <Fragment>
                <div>Removing { removedItem.shopify_title }.</div>
                <div class="tr">To continue please select a replacement.</div>
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
              </Fragment>
            ) : (
              <div>Unable to swap { removedItem.shopify_title }.</div>
            )}
            <button
              name="close"
              type="button"
              class="button button--secondary"
              id="selectSwapClose"
              title="Cancel"
              onclick={ cancelSwap }
              style={{
                color: getSetting("Colour", "button-foreground"),
                "background-color": getSetting("Colour", "button-background"),
                "border-color": getSetting("Colour", "button-background"),
                "font-size": "0.9em",
                "width": "100%"
                }}
            >
              { possibleSwaps.length === 0 ? "Continue" : "Cancel" }
            </button>
          </Fragment>
        )}
      </Fragment>
    );
  };
};

export default CollapseWrapper(SwapSelector);
