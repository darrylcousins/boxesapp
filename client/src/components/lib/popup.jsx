/**
 * Popup
 *
 * @module app/popup
 * @exports {Element} Popup
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { animationOptions, getSetting } from "../../helpers";
import CollapseWrapper from "../lib/collapse-animator";

function Popup ({ text, buttons, callback }) {

  /*
   * I need to make this collapsible so that it can force it's way into the dom
   * and not be overlayed, rendering buttons unclickable
   *
   * A couple of years later, only using this for confirming add to cart so who cares?
   */
  
  /**
   * Agree to question
   */
  const popupAffirm = () => {
    callback(true);
  }

  /**
   * Deny
   */
  const popupDeny = () => {
    callback(false);
  }

  // could get id from collapsible

  return (
    <div id="boxesapp-popup">
      <div class="hack-to-fix-height" style="position: absolute; top: 0; left:0">&nbsp;</div>
      <p>{text}</p>
      { buttons && (
        <div>
          <button
            type="button"
            name="cancel"
            aria-label="Cancel"
            onclick={popupDeny}
            class="button boxesapp-button"
          >
            Not yet
          </button>
          <button
            type="button"
            name="yes"
            aria-label="Yes"
            onclick={popupAffirm}
            class="button boxesapp-button"
          >
            Yes
          </button>
        </div>
      )}
    </div>
  );
}

//export default Popup;
export default CollapseWrapper(Popup);
