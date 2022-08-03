/**
 * Creates element to render a modal for editing multiple orders
 *
 * @module app/components/orders-edit
 * @exports EditOrders
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal } from "@b9g/crank";

import { Fetch, PostFetch } from "../lib/fetch";
import { CloseIcon } from "../lib/icon";
import Button from "../lib/button";
import BarLoader from "../lib/bar-loader";
import ModalTemplate from "../lib/modal-template";
import { dateStringForInput } from "../helpers";

/**
 * Creates element to render a modal for editing multiple orders
 *
 * @generator
 * @yields {Element}
 */
function* EditOrders({selectedOrders}) {

  /**
   * Is the modal visible?
   *
   * @member {boolean} visible
   */
  let visible = false;

  /**
   * Action which closes the modal and refreshes component. Normally attached
   * to the modal `close` button and the `cancel` button.
   *
   * @function closeModal
   */
  const closeModal = () => {
    visible = false;
    this.refresh();
  };

  /**
   * Action which opens the modal and refreshes component
   *
   * @function showModal
   */
  const showModal = async () => {
    visible = true;
    await getOrders();
    this.refresh();
  };
  /**
   * If fetch returns an error
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;
  /**
   * If form invalid - i.e. no delivery date selected
   *
   * @member {object|string} formError
   */
  let formError = false;
  /**
   * True while loading data from api
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * True after edit
   *
   * @member {boolean} success
   */
  let success = false;
  /**
   * Orders fetched from api
   *
   * @member {object} fetchOrders
   */
  let fetchOrders = [];
  /**
   * Not good enough if editing multiple fields but for now ...
   * Update pickup date value
   *
   * @member {date} pickupDate
   */
  let pickupDate = null;

  /**
   * Hide the modal on escape key
   *
   * @function hideModal
   * @param {object} ev Event emitted
   * @listens window.keyup
   */
  const hideModal = async (ev) => {
    if (ev.key && ev.key === "Escape") {
      closeModal();
    }
  };

  this.addEventListener("keyup", hideModal);

  /**
   * Control the value field
   *
   * @function updateValue
   */
  const updateValue = async (value) => {
    pickupDate = value; // this is a string
    this.refresh();
  };

  /**
   * Save the new pickup value
   *
   * @function updateValue
   */
  const savePickupDate = async () => {
    if (pickupDate === null) {
      formError = true;
      this.refresh();
      return;
    } else {
      formError = false;
    };
    const pickup = new Date(pickupDate).toDateString();
    const data = {
      pickup,
      _ids: selectedOrders,
    };
    let headers = { "Content-Type": "application/json" };
    const src = "/api/bulk-edit-orders";
    PostFetch({ src, data, headers })
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          console.log("Fetch:", fetchError);
          loading = false;
          this.refresh();
        } else {
          loading = false;
          success = true;
          this.refresh();
          setTimeout(() => {
            this.dispatchEvent(
              new CustomEvent("listing.reload", {
                bubbles: true,
              })
            );
            closeModal();
          }, 2000);
        }
      })
      .catch((err) => {
        console.err("ERROR:", err);
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  /**
   * Fetch selected orders
   *
   * @function getOrders
   */
  const getOrders = () => {
    const uri = `/api/orders-by-ids?ids=${encodeURIComponent(selectedOrders)}`;
    console.log(uri);
    Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          fetchOrders = json;
          loading = false;
          this.refresh();
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  const main = document.getElementById("modal-window");

  for (const _ of this) { // eslint-disable-line no-unused-vars

    yield (
      <Fragment>
        <Button
          type="primary"
          onclick={showModal}
        >Edit Selected</Button>
        {visible && (
          <Portal root={main}>
            <ModalTemplate closeModal={ closeModal } loading={ loading } error={ fetchError } withClose={ false }>
              {fetchOrders.length > 0 && (
                <Fragment>
                  <div class="tc center">
                    <h6 class="fw4 tl fg-streamside-maroon">Change Pick Up Date For Orders</h6>
                  </div>
                  <legend class="dn fw6 ph0 mh0">Edit orders</legend>

                  <div class="bt b--black-20" />
                  {fetchOrders.map((el, idx) => (
                    <Fragment>
                      <p class="pv2 fl mv0 w-25"><span class="b mr3">{idx+1}.</span> {el.name}</p>
                      <p class="pv2 fl mv0 w-25">{el.pickup}</p>
                      <p class="pv2 fl mv0 w-25">{el.delivered}</p>
                      <p class="pv2 fl mv0 w-25">{el.order_number}</p>
                      <div class="cf bb b--black-20" />
                    </Fragment>
                  ))}
                  {success && (
                    <div class="mv2 pt2 pl2 br3 dark-green ba b--dark-green bg-washed-green">
                      <p class="tc">Orders updated, reloading page</p>
                    </div>
                  )}
                  <div class="w-100 ba b--black-20 pa2 mt3 br2">
                    <div class="w-50">
                      <div class="tl ph2 mt1 ml0">
                        <label class="fw6 lh-copy" htmlFor="field" for="field">
                          Select pickup date for courier
                        </label>
                        <input
                          class={`mr1 pa2 ba bg-transparent hover-bg-near-white w-100 input-reset br2 ${formError ? "invalid" : ""}`}
                          type="date"
                          id="filter"
                          value={pickupDate}
                          onchange={(ev) => updateValue(ev.target.value)}
                          min={dateStringForInput()}
                        />
                        <span class={`small mt1 fg-streamside-orange ${!formError ? "hidden" : ""}`}>
                          Pickup date is required
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="w-100 tr">
                    <Button type="primary" onclick={savePickupDate}>
                      Apply Filter
                    </Button>
                    <Button type="secondary" onclick={closeModal}>
                      Cancel
                    </Button>
                  </div>
                </Fragment>
              )}
            </ModalTemplate>
          </Portal>
        )}
      </Fragment>
    );
  };
};

export default EditOrders;
