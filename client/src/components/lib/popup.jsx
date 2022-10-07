/**
 * Popup
 *
 * @module app/popup
 * @exports {Element} Popup
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import { animationOptions, getSetting } from "../../helpers";

function Popup ({ id, active, text, buttons, callback }) {
  
  /**
   * Are we visible
   */
  let visible = active;

  /**
   * Dismiss popup
   */
  const dismissPopup = async (result) => {
    const popup = document.querySelector(`#popup-${id}`);
    if (popup) {
      const animation = popup.animate({ opacity: 0 }, animationOptions);
      animation.addEventListener("finish", () => {
        visible = false;
        this.refresh();
        if (callback) callback(result);
      });
    }
  };

  /**
   * Agree to question
   */
  const popupAffirm = () => {
    dismissPopup(true);
  }

  /**
   * Deny
   */
  const popupDeny = () => {
    dismissPopup(false);
  }

  return (
    visible && (
      <div class="relative">
      <div
        id={`popup-${id}`}
        class="popup-container"
        style={{
          "background-color": getSetting("Colour", "warn-bg")
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
        <div id={`popup-inner-${id}`}>
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
      </div>
    )
  );
}

export default Popup;
