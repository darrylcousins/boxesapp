/**
 * Popup
 *
 * @module app/popup
 * @exports {Element} Popup
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import { animationOptions, getSetting } from "../../helpers";
import CollapseWrapper from "../lib/collapse-animator";

function Popup ({ text, buttons, callback }) {

  /*
   * I need to make this collapsible so that it can force it's way into the dom
   * and not be overlayed, rendering buttons unclickable
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

  return (
    <div
      id={`popup`}
      class="popup-container"
      style={{
        "font-weight": "bold",
        "background-color": "#FEEFB3",
        "color": "#9F6000",
      }}>
      <button
        class="close-button"
        name="dismiss"
        type="button"
        title="Dismiss"
        onclick={popupDeny}
      >
        &#x2716;
        <span class="dn">Dismiss</span>
      </button>
      <div id={`popup-inner`}>
        <p>{text}</p>
        { buttons && (
          <div class="button-wrapper">
            <button
              type="button"
              name="cancel"
              aria-label="Cancel"
              onclick={popupDeny}
              style={{
                color: getSetting("Colour", "button-foreground"),
                "background-color": getSetting("Colour", "button-background"),
                "border-color": getSetting("Colour", "button-background"),
                "font-size": "0.9em"
                }}
            >
              Not yet
            </button>
            <button
              type="button"
              name="yes"
              aria-label="Yes"
              onclick={popupAffirm}
              style={{
                color: getSetting("Colour", "button-foreground"),
                "background-color": getSetting("Colour", "button-background"),
                "border-color": getSetting("Colour", "button-background"),
                "font-size": "0.9em"
                }}
            >
              Yes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

//export default Popup;
export default CollapseWrapper(Popup);
