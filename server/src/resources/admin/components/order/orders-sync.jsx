/**
 * Sync shopify orders with mongo database. **Historical** - do not use without
 * revisiting the code to verify its veracity!
 *
 * @module app/components/orders-sync
 * @exports SyncOrders
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import Fetch from "../lib/fetch";
import Button from "../lib/button";
import { CloseIcon } from "../lib/icon";

/**
 * Sync shopify orders with mongo database. **Historical** - do not use without
 * revisiting the code to verify its veracity!
 *
 * @generator
 * @yields {Element} 
 */
function* SyncOrders() {
  let loading = false;
  let fetchError = false;
  let success = false;
  let active = false;

  const reset = () => {
    loading = false;
    fetchError = null;
    active = false;
    this.refresh();
  };

  const show = () => {
    active = true;
    this.refresh();
  };

  const loadSync = () => {
    Fetch(`/api/sync-orders`)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          console.log("fetch error:", error);
          loading = false;
          this.refresh();
        } else {
          console.log("fetch return:", json);
          loading = false;
          success = true;
          this.refresh();
          setTimeout(window.location.reload, 2000);
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  while (true) {
    yield (
      <Fragment>
        <div class="ph1 pv0 tr dib">
          <button
            onclick={show}
            class="pointer link dim mid-gray bg-white f6 fw6 ttu tracked dib mr3 ba b--mid-gray br2 pa2"
            title="Sync Orders"
            type="button"
          >
            Sync Orders
          </button>
        </div>
        {active && (
          <div class="tl relative dark-gray mb2 mt5 pa3 br3 ba b--dark-gray bg-washed-blue">
            <button
              class="bn outline-0 bg-transparent pa0 no-underline mid-gray dim o-70 absolute top-1 right-1"
              name="close"
              onclick={reset}
              type="button"
              style="margin-right: 30px; margin-top: 30px;"
              title="Close modal"
            >
              <CloseIcon />
              <span class="dn">Close modal</span>
            </button>
            {loading ? (
              <BarLoader />
            ) : (
              <Fragment>
                <div class="tc">
                  <h2 class="fw3 fg-streamside-maroon">
                    Synchronise shopify orders
                  </h2>
                </div>
                <p class="lh-copy pt1">
                  When a new order is created on Shopify a notification is sent
                  here and the order included into this interface. Similarly a
                  notification is also received when an order is
                  <code>fulfilled</code> via the Shopify administration
                  interface which removes the order from this listing. Other
                  orders can be imported using <code>csv</code> files (from
                  BuckyBox) and <code>xlsx</code> files (for CSA boxes). However
                  if it does happen that the orders here are not synchronised
                  correctly (or have been accidentally removed) then clicking
                  the <code>sync now</code> button will synchronise this listing
                  with all <code>unfulfilled</code>
                  orders from Shopify.
                  <div class="v-top tr">
                    <Button onClick={loadSync}>Sync now</Button>
                  </div>
                </p>
              </Fragment>
            )}
            {fetchError && <Error msg={fetchError} />}
            {success && (
              <div class="dark-gray pa3 mv2 br3 ba b--dark-gray bg-washed-green">
                Successfully synchronised orders, reloading page.
              </div>
            )}
          </div>
        )}
      </Fragment>
    );
  }
}

export default SyncOrders;