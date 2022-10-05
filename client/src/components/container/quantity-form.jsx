/**
 * Form for editing quantities
 *
 * @module app/quantity-form
 * @exports {Element} QuantityForm
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { moveProductEvent, quantityUpdateEvent } from "../events";
import { toPrice, getPrice } from "../../helpers";
import { getSetting, animateFadeForAction } from "./../../helpers";

/**
 * Component to update quantities in box
 *
 * @returns {Element} DOM component
 */
function *QuantityForm({ selectedIncludes, selectedAddons, selectedSwaps }) {

  let hasChanged = false;

  const TitleInput = ({ el }) => (
    <input
      class="input-title"
      type="text"
      readonly
      name="title"
      value={`${el.shopify_title} (${toPrice(el.shopify_price)})`}
    />
  );

  const QuantityInput = ({ el, id }) => {
    // Should look in moveProduct to find where the quantity is not set
    if (!Object.hasOwnProperty.call(el, "quantity")) el.quantity = 1;
    return (
      <input
        class="input-quantity"
        type="number"
        steps="1"
        min={ id === "selectedIncludes" ? 1 : 0 }
        name="quantity"
        data-id={id}
        id={el.shopify_product_id}
        value={el.quantity}
        autocomplete="off"
      />
    );
  };

  const PriceInput = ({ el, includes }) => {
    // Should look in moveProduct to find where the quantity is not set
    if (!Object.hasOwnProperty.call(el, "quantity")) el.quantity = 1; 
    return (
      <input
        class="input-price"
        type="text"
        readonly
        name="title"
        value={getPrice(el, includes)}
      />
    );
  };

  /** 
   * Map strings to the lists
   *
   * @function listMap
   */
  const listMap = (str) => {
    let list;
    switch(str) {
      case 'selectedAddons':
        list = selectedAddons;
        break;
      case 'selectedIncludes':
        list = selectedIncludes;
        break;
      case 'selectedSwaps':
        list = selectedSwaps;
        break;
    }
    return list;
  }
  /**
   * Handle change on selected input elements
   *
   * @function handleChange
   * @param {object} ev The firing event
   * @listens change
   */
  const handleChange = (ev) => {
    if (ev.target.tagName === "INPUT") {
      if (ev.target.name === "quantity") {
        if (ev.target.value === "0") {
          animateFadeForAction(ev.target.parentNode, async () => {
            await this.dispatchEvent(quantityUpdateEvent(ev.target.id, ev.target.value, ev.target.getAttribute("data-id")));
          });
        } else {
          this.dispatchEvent(quantityUpdateEvent(ev.target.id, ev.target.value, ev.target.getAttribute("data-id")));
        }
        hasChanged = true;
      }
    }
  };
  this.addEventListener("change", handleChange);

  for ({selectedIncludes, selectedAddons, selectedSwaps} of this) {
    yield (
      <div class="relative">
        <div id="quantityModal">
          <button
            class="close-button"
            name="close"
            type="button"
            id="qtyFormClose"
            title="Close modal"
          >
            &#x2716;
            <span class="dn">Close modal</span>
          </button>
          <div class="listing-wrapper">
            <div class="listing-title">
              {getSetting("Translation", "modal-included-title")}:
            </div>
            {selectedIncludes.map(el => 
              <div class="input-wrapper">
                <TitleInput el={el} />
                <QuantityInput el={el} id="selectedIncludes" />
                <PriceInput el={el} includes={true} />
              </div>
            )}
            {(selectedAddons.length > 0) && (
              <Fragment>
                <div class="listing-title">
                  {getSetting("Translation", "modal-addons-title")}:
                </div>
                {selectedAddons.map(el => 
                  <div class="input-wrapper">
                    <TitleInput el={el} />
                    <QuantityInput el={el} id="selectedAddons" />
                    <PriceInput el={el} includes={false} />
                  </div>
                )}
              </Fragment>
            )}
            {(selectedSwaps.length > 0) && (
              <Fragment>
                <div class="listing-title">
                  {getSetting("Translation", "modal-swaps-title")}:
                </div>
                {selectedSwaps.map(el => 
                  <div class="input-wrapper">
                    <TitleInput el={el} />
                    <QuantityInput el={el} id="selectedSwaps" />
                    <PriceInput el={el} includes={true} />
                  </div>
                )}
              </Fragment>
            )}
            <div class="tr button-wrapper">
              <button
                name="close"
                type="button"
                id="qtyFormClose"
                title="Close modal"
                style={{
                  color: getSetting("Colour", "button-foreground"),
                  "background-color": getSetting("Colour", "button-background"),
                  "border-color": getSetting("Colour", "button-background"),
                  "font-size": "0.9em"
                  }}
                >
                  {hasChanged ? "Done" : "Close"}
                </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
};

export default QuantityForm;
