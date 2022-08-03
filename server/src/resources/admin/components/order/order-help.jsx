/**
 * Creates element to render a help section on order listing
 *
 * @module app/components/order-help
 * @exports HelpSection
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { HelpIcon, CloseIcon } from "../lib/icon";

/**
 * Display a help section
 *
 * @generator
 * @yields {Element} DOM element displaying help section
 * @param {object} props Property object
 * @param {object} props.children Nested elements
 */
function* HelpSection({ children }) {
  /**
   * Hold visibility state.
   *
   * @member {boolean} visible
   */
  let visible = false;

  /**
   * Hide help section
   *
   * @function remove
   */
  const remove = () => {
    visible = false;
    this.refresh();
  };

  /**
   * Toggle visibility
   *
   * @function toggleVisibility
   * @param {object} ev The event emitted on click
   * @listens window.click
   */
  const toggleVisibility = async (ev) => {
    const name = ev.target.tagName.toUpperCase();
    if (name === "SVG" || name === "PATH") {
      visible = !visible;
      this.refresh();
    } else {
      remove();
    }
  };

  this.addEventListener("click", toggleVisibility);

  while (true)
    yield (
      <Fragment>
        {!visible ? (
          <button
            class="pointer bn bg-transparent outline-0 mid-gray dim o-70 absolute top-1 right-1"
            name="open"
            title="Get further info"
            type="button"
          >
            <HelpIcon />
            <span class="dn">Get info</span>
          </button>
        ) : (
          <Fragment>
            <button
              class="pointer bn bg-transparent outline-0 mid-gray dim o-70 absolute top-1 right-1"
              name="close"
              title="Close info"
              type="button"
            >
              <CloseIcon />
              <span class="dn">Close info</span>
            </button>
            {children}
          </Fragment>
        )}
      </Fragment>
    );
}

export default HelpSection;