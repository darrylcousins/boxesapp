/**
 * The variant selector component used by container-box
 *
 * @module app/components/container/variant-selector
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { selectVariantEvent } from "../lib/events";
import { getSetting } from "../../helpers";

/**
 * Variant selector component
 *
 * @yields {Element} DOM component
 */
function* VariantSelector({boxVariants, selectedVariant}) {

  /**
   * Handle mouse up on selected components
   *
   * @function handleMouseUp
   * @param {object} ev The firing event
   * @listens click
   */
  const handleMouseUp = (ev) => {
    if (ev.target.tagName === "BUTTON") {
      const variant_id = ev.target.getAttribute("data-item");
      //this.dispatchEvent(selectorOpenEvent(null));
      this.dispatchEvent(selectVariantEvent(variant_id));
      selectVariantOpen = false;
      this.refresh();
      return;
    };
  };
  this.addEventListener("mouseup", handleMouseUp);

  for ({boxVariants, selectedVariant} of this) {
    yield (
      <div id="variantSelector">
        { (boxVariants.length > 0) ? (
          <Fragment>
            <div class="relative boxesapp-choice-wrapper">
              {boxVariants.map((el, idx, arr) => (
                <button 
                  data-item={el.item}
                  data-title={el.text}
                  class={ `boxesapp-choice${selectedVariant.title === el.text ? " boxesapp-choice-selected" : ""}` }>
                  { el.text }
                </button>
              ))}
            </div>
          </Fragment>
        ) : ""
        }
      </div>
    )
  }
};

export default VariantSelector;
