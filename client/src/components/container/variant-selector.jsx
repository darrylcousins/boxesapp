/**
 * The variant selector component used by container-box
 *
 * @module app/components/container/variant-selector
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { selectVariantEvent, selectorOpenEvent } from "../events";
import SelectMenu from "../select-menu";
import { getSetting } from "../../helpers";

/**
 * Variant selector component
 *
 * @yields {Element} DOM component
 */
function* VariantSelector({boxVariants, selectedVariant}) {

  /**
   * Display variant selection menu if active
   *
   * @member selectVariantOpen
   * @type {boolean}
   */
  let selectVariantOpen = false;
  /**
   * Selector id for select menu
   *
   * @member selectorId
   * @type {string}
   */
  const selectorId = "selectVariant";

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
        case selectorId:
          this.dispatchEvent(selectorOpenEvent(selectorId));
          break;
      }
    } else if (ev.target.tagName === "DIV") {
      switch(ev.target.getAttribute("name")) {
        case selectorId:
          const variant_id = ev.target.getAttribute("data-item");
          this.dispatchEvent(selectorOpenEvent(null));
          this.dispatchEvent(selectVariantEvent(variant_id));
          break;
      }
    }
  };
  this.addEventListener("mouseup", handleMouseUp);
  /**
   * Handle selector open event, if matching selectorId the menu is open, else close
   *
   * @function handleSelectorOpen
   * @param {object} ev The firing event
   * @listens selectorOpenEvent
   */
  const handleSelectorOpen = (ev) => {
    if (selectorId === ev.detail.selector) {
      selectVariantOpen = !selectVariantOpen;
    } else {
      selectVariantOpen = false;
    }
    this.refresh();
  };
  this.addEventListener("selectorOpenEvent", handleSelectorOpen)

  for ({boxVariants, selectedVariant} of this) {
    yield (
      <div id="variantSelector">
        { (boxVariants.length > 0) ? (
          <Fragment>
            <div class="relative">
              <SelectMenu
                id={selectorId}
                menu={boxVariants}
                title="Select Delivery Day"
                active={selectVariantOpen}
              >
                { selectedVariant.title }&nbsp;&nbsp;&nbsp;{ selectVariantOpen ? "▴" : "▾" }
              </SelectMenu>
            </div>
          </Fragment>
        ) : ""
        }
      </div>
    )
  }
};

export default VariantSelector;
