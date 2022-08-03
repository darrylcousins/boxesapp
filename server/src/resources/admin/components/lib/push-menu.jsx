/**
 * Side bar push menu
 *
 * @module app/lib/push-menu
 * @requires module:app/styles/_push-menu.scss
 * @exports PushMenu
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { MenuIcon, CloseIcon } from "../lib/icon";
import IconButton from "../lib/icon-button";

/**
 * Make a side menu
 * {@link module:app/boxes} to display as a table.
 *
 * @generator
 * @yields {Element}
 */
function* PushMenu({children}) {

  /**
   * Is the menu open
   *
   * @member open
   * @type {boolean}
   */
  let open = false;

  /*
   * Toggle menu
   *
   */
  this.addEventListener("click", () => {
    open = !open;
    const nav = document.getElementById("sidemenu");
    if (open) {
      nav.style.width = "200px";
    } else {
      nav.style.width = "0";
    }
    //this.refresh();
  });

  for ({children} of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <div class="sidemenu" id="sidemenu">
          <button
            class="bn bg-transparent outline-0 white dim o-70 absolute top-1 right-1"
            name="close"
            title="Close menu"
            type="button"
          >
            <CloseIcon />
            <span class="dn">Close menu</span>
          </button>
          {children}
        </div>
        <div class="di mr3 pt3">
          <IconButton color="near-black" title="Open menu" name="Open menu">
            <MenuIcon />
          </IconButton>
        </div>
      </Fragment>
    );
  };
};

export default PushMenu;
