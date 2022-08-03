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
function* PushMenu({menu}) {

  /**
   * Is the menu open
   *
   * @member open
   * @type {boolean}
   */
  let open = false;

  /**
   * Close the navigation menu
   *
   * @function closeMenu
   */
  const closeMenu = () => {
    console.log('closing menu');
    open = false;
    this.refresh();
  };

  /**
   * Open the navigation menu
   *
   * @function openMenu
   */
  const openMenu = () => {
    console.log("open menu");
    open = true;
    this.refresh();
  };

  this.addEventListener("click", () => {
    open = !open;
    this.refresh();
  });

  //for (const _ of this) { // eslint-disable-line no-unused-vars
  while (true) {
    console.log('open is:', open);
    yield (
      open ? (
        <div class="sidemenu">
          <button
            class="bn bg-transparent outline-0 white dim o-70 absolute top-1 right-1"
            name="close"
            title="Close menu"
            type="button"
          >
            <CloseIcon />
            <span class="dn">Close menu</span>
          </button>
          {menu.map(el => (
            <a href={el.href} title={el.title} class="link f5 white pv1 pl3 pr2">{el.title}</a>
          ))}
        </div>
      ) : (
        <div class="di mr3">
          <IconButton color="near-black" title="Open menu" name="Open menu">
            <MenuIcon />
          </IconButton>
        </div>
      )
    );
  };
};

export default PushMenu;