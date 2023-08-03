/**
 * Creates element to render a page to edit the core box
 *
 * @module app/components/box-core
 * @exports CoreBoxModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal } from "@b9g/crank";
import { AddIcon, CaretUpIcon, CaretDownIcon, CloseIcon, DeleteIcon } from "../lib/icon";
import { PostFetch, Fetch } from "../lib/fetch";
import Button from "../lib/button";
import BarLoader from "../lib/bar-loader";
import IconButton from "../lib/icon-button";
import Products from "./box-products";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import { sortObjectByKey } from "../helpers";

/**
 * Creates element to render a modal to edit the core box
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {object} props.order The order to be displayed
 */
function* CoreBox() {
  /**
   * Hold visibility state.
   *
   * @member {boolean} visible
   */
  let visible = false;
  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Has the box been deleted
   *
   * @member {boolean} deleted
   */
  let deleted = false;
  /**
   * Menu text, dependent on existance of core box
   *
   * @member {string} menuText
   */
  let menuText = "";
  /**
   * The core box object
   *
   * @member {string} box
   */
  let box = null
  /**
   * Hold collapsed state of product listings
   *
   * @member {boolean} collapsed
   */
  let collapsed = false;

  /*
   * Toggle collapse of product listings
   */
  const toggleCollapse = () => {
    collapsed = !collapsed;
    this.refresh();
  };

  /**
   * Create the core box if not exists
   *
   * @function createCoreBox
   */
  const createCoreBox = () => {
    const headers = { "Content-Type": "application/json" };
    PostFetch({
      src: "/api/create-core-box",
      data: {},
      headers,
    })
      .then((result) => {
        if (!result.formError && !result.error) {
          loading = false;
          box = result.json;
          this.refresh();
          const notice = "Created a core box";
          this.dispatchEvent(toastEvent({
            notice,
            bgColour: "black",
            borderColour: "black"
          }));
        };
      })
      .catch((e) => {
        console.log("Got an error");
        return;
      });
  };

  /**
   * Delete the core box
   *
   * @function deleteCoreBox
   */
  const deleteCoreBox = () => {
    loading = true;
    this.refresh();
    const headers = { "Content-Type": "application/json" };
    PostFetch({
      src: "/api/delete-core-box",
      data: {},
      headers,
    })
      .then((result) => {
        console.log(result);
        if (!result.formError && !result.error) {
          getCoreBox(); // if error !?
          const notice = "Deleted core box";
          this.dispatchEvent(toastEvent({
            notice,
            bgColour: "black",
            borderColour: "black"
          }));
        };
      })
      .catch((e) => {
        console.log("Got an error");
        return;
      });
  };

  /**
   * Fetch core box if it exists to set up sideMenu
   *
   * @function getBoxes
   */
  const getCoreBox = () => {
    let uri = `/api/get-core-box`;
    Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          //fetchError = error;
          this.refresh();
        } else {
          box = json;
          console.log(json);
          loading = false;
          deleted = false;
          this.refresh();
        }
      })
      .catch((err) => {
        //fetchError = err;
        this.refresh();
      });
  };

  /**
   * Event handler when {@link
   * module:form/form-modal~FormModalWrapper|FormModalWrapper} saves the data
   *
   * @function reloadBoxes
   * @param {object} ev The event
   * @listens listing.reload
   */
  const reloadBox = (ev) => {
    getCoreBox();
  };

  this.addEventListener("listing.reload", reloadBox);

  /**
   * For messaging user
   */
  this.addEventListener("toastEvent", Toaster);

  getCoreBox();

  for (const _ of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <div>
          { loading && <BarLoader /> }
          { !box && !loading && (
            <Fragment>
              <div class="mv3 pt2 pl2 br3 dark-green ba b--dark-green bg-washed-green">
                <p class="tc">
                  No core box
                </p>
              </div>
              <div class="tr" onclick={createCoreBox}>
                <IconButton color="navy" title="Create core box" name="Create core box">
                  <AddIcon />
                </IconButton>
              </div>
            </Fragment>
          )}
          { box && (
            <Fragment>
              <div class="tc center">
                <h4 class="pt0 lh-title ma0 fg-streamside-maroon">
                  Edit The Core Box
                </h4>
              </div>
              <div class="tr">
                <button
                  class="bn bg-transparent outline-0 dark-red dim pointer"
                  name="delete"
                  onclick={deleteCoreBox}
                  title="Delete core box"
                  type="button"
                >
                  <DeleteIcon />
                  <span class="dn">Delete core box</span>
                </button>
              </div>
              <table>
                <td data-title="Included" class="w-30-l pv3 pr3 bb b--black-20 black-50 v-top">
                  <div class="dt dt--fixed hover-dark-green pointer"
                    onclick={toggleCollapse}>
                    <span class="dtc">
                      {box.includedProducts.length} included products
                    </span>
                    <span class="v-mid">
                      {collapsed ? (
                        <CaretDownIcon />
                      ) : (
                        <CaretUpIcon />
                      )}
                    </span>
                  </div>
                  <Products 
                    products={sortObjectByKey(box.includedProducts, "shopify_title")}
                    allproducts={box.includedProducts.concat(box.addOnProducts)}
                    collapsed={collapsed}
                    type="includedProducts"
                    box={box}
                    id={`included-${box.shopify_product_id}`}
                  />
                </td>
                <td data-title="Add Ons" class="w-30-l pv3 pr3 bb b--black-20 black-50 v-top">
                  <div class="dt dt--fixed hover-dark-green pointer"
                      onclick={toggleCollapse}>
                    <span class="dtc">
                      {box.addOnProducts.length} add on products
                    </span>
                    <span class="v-mid">
                      {collapsed ? (
                        <CaretDownIcon />
                      ) : (
                        <CaretUpIcon />
                      )}
                    </span>
                  </div>
                  <Products 
                    products={sortObjectByKey(box.addOnProducts, "shopify_title")}
                    allproducts={box.includedProducts.concat(box.addOnProducts)}
                    collapsed={collapsed}
                    type="addOnProducts"
                    box={box}
                    id={`addons-${box.shopify_product_id}`}
                  />
                </td>
              </table>
            </Fragment>
          )}
        </div>
      </Fragment>
    );
  };
}

export default CoreBox;
