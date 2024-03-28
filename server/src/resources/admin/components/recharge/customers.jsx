/**
 * Creates element to render recharge subsciptions
 *
 * @module app/recharge/subscriptions
 * @requires module:app/recharge/subscriptions~Customers
 * @exports Customers
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import Button from "../lib/button";
import IconButton from "../lib/icon-button";
import { SearchIcon, ClearSearchIcon, SyncIcon } from "../lib/icon";
import Pagination from "../lib/pagination";
import { Fetch, PostFetch } from "../lib/fetch";
import PushMenu from "../lib/push-menu";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import { animateFadeForAction } from "../helpers";
import Customer from "./customer";
import PendingUpdates from "./pending-updates";
import VerifySubscriptions from "./verify-subscriptions";

/**
 * Create subscription listing
 *
 * @generator
 * @yields {Element} - a html table display of the boxes
 */
async function* Customers() {

  /**
   * Links to admin interfaces
   */
  const shopAdminUrl = `https://${ localStorage.getItem("shop") }/admin/customers`;
  const rechargeAdminUrl = `https://${ localStorage.getItem("recharge") }.admin.rechargeapps.com/merchant/customers`;
  /**
   * Customers with active subscriptions, or not, or all
   *
   * @member logLevel
   * @type {string}
   */
  let selectActive = "active";
  /**
   * True while loading data from api
   * Starts false until search term submitted
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * The search term entered
   *
   * @member {object|string} searchTerm
   */
  let searchTerm = null;
  /**
   * If the search term is invalid
   *
   * @member {object|string} searchError
   */
  let searchError = null;
  /**
   * If fetch returns an error
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;
  /**
   * The loaded customer from api
   *
   * @member {object|string} fetchCustomer
   */
  let fetchCustomer = null;
  /**
   * Used to pass to Customer if we only want a single charge displayed
   *
   * @member {object|string} customerCharge
   */
  let customerCharge = null;
  /**
   * The loaded customers from api
   *
   * @member {object|string} rechargeCustomers
   */
  let rechargeCustomers = null;
  /**
   * Capture full count across all pages
   *
   * @member customerCount
   * @type {object|null}
   */
  let customerCount = null;
  /**
   * Capture pageNumber
   *
   * @member pageNumber
   * @type {object|null}
   */
  let pageNumber = 1;
  /**
   * Capture pageCount
   *
   * @member pageCount
   * @type {object|null}
   */
  let pageCount = null;
  /**
   * Capture pageSize
   *
   * @member pageSize
   * @type {object|null}
   */
  let pageSize = null;
  /**
   * A loading label inserted to  'Hold tight' text
   *
   * @member loadingLabel
   * @type {string|null}
   */
  let loadingLabel = null;
  /**
   * Capture any customers on updates_pending table
   *
   * @member updatesPending
   * @type {object|null}
   */
  let updatesPending = null;
  /**
   * Capture any faulty subscriptions found in nightly verify-subscriptions script
   *
   * @member faultySubscriptions
   * @type {object|null}
   */
  let faultySubscriptions = null;

  /**
   * Handle the event calling to load another customer
   *
   * @function getNewCustomer
   * @listens loadAnotherCustomer
   */
  const getNewCustomer = async () => {
    fetchError = null;
    loading = false;
    fetchCustomer = null;
    customerCharge = null;
    // also reload pending and verify?
    await this.refresh();
    if (document.getElementById("searchTerm")) {
      document.querySelector("#searchTerm").focus();
    };
  };
  this.addEventListener("loadAnotherCustomer", getNewCustomer);

  /**
   * Filter collection on a log level
   *
   * @function changeLevel
   */
  const changeSelectActive = async (activeOption) => {
    selectActive = activeOption; // active, none-active, all
    loading = true;
    await this.refresh();
    fetchCustomers();
  };

  /**
   * Change page number
   *
   * @function movePage
   */
  const movePage = async (page) => {
    pageNumber = parseInt(page.pageTarget);
    return await fetchCustomers();
  };

  /**
   * Fetch all customers on start
   *
   * @param {string} id The shopify customer id
   * @function fetchCustomers
   */
  const fetchCustomers = async () => {
    let uri = `/api/recharge-customers?selectActive=${selectActive}&page=${pageNumber}`;
    if (searchTerm) {
      uri = `${uri}&search=${searchTerm}`;
    };
    await Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        //console.log(json);
        pageCount = json.pageCount;
        pageSize = json.pageSize;
        pageNumber = json.pageNumber;
        updatesPending = json.updatesPending;
        faultySubscriptions = json.faultySubscriptions;
        customerCount = json.customerCount;
        rechargeCustomers = json.customers;
        loading = false;
        if (document.getElementById("customer-table")) {
          animateFadeForAction("customer-table", async () => await this.refresh());
        } else {
          this.refresh();
        };
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
  };

  // reload customers after fixing updates pending or similar
  this.addEventListener("reloadCustomers", fetchCustomers);

  /**
   * Fetch customer charge, i.e. collect a single charge to load for customer
   * instead of all charges, useful if customer has many charges
   *
   * @param {string} id The recharge charge id
   * @function fetchCustomerCharge
   */
  const fetchCustomerCharge = async (customer, charge_id) => {
    console.log(charge_id);
    customerCharge = charge_id;
    await fetchRechargeCustomer(customer.recharge_id);
  };

    /**
   * Fetch recharge customer
   *
   * @param {string} id The recharge customer id
   * @function fetchRechargeCustomer
   */
  const fetchRechargeCustomer = async (customer_id) => {
    // slow things down a bit
    fetchError = null;
    const customer = rechargeCustomers.find(el => el.recharge_id === customer_id);
    loadingLabel = `charges for ${customer.first_name} ${customer.last_name}`;
    loading = true;
    setTimeout(() => {
      this.refresh();
      doFetchRechargeCustomer(customer_id);
    }, 300);
  };

  /**
   * Fetch recharge customer
   *
   * @param {string} id The recharge customer id
   * @function fetchRechargeCustomer
   */
  const doFetchRechargeCustomer = async (customer_id) => {
    const uri = `/api/recharge-customer?recharge_customer_id=${customer_id}`;
    window.scrollTo({top: 0, left: 0, behavior: "smooth" });
    await Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          loadingLabel = null;
          this.refresh();
          return null;
        };
        fetchCustomer = json;
        loading = false;
        /* animate here
        const content = document.querySelector("#page-content");
        const options = { ...animationOptions };
        let animate = content.animate({ opacity: 0.05 }, options);
        */
        this.refresh();
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
  };

  /**
   * update local mongodb store of customers with recharge
   * change to reload single customer
   *
   * @param {string} id The recharge customer id
   * @function fetchRechargeCustomer
   */
  const updateRechargeCustomer = async (recharge_id) => {
    const uri = `/api/recharge-customers-update/${recharge_id}`;
    fetchError = null;
    loading = true;
    const button = document.querySelector(`#sync-${recharge_id}`);
    if (button) button.blur();
    this.refresh();
    await Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          // toast event and obvious reload
          return null;
        };
        fetchCustomers();
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
  };

  /**
   * Clear search from button icon
   *
   * @function clearSearchTerm
   */
  const clearSearchTerm = async () => {
    const button = document.querySelector("button[name='Clear Search'");
    if (button) button.blur();
    const input = document.querySelector("#searchTerm");
    if (input) {
      input.value = "";
      input.focus();
    };
    if (!searchTerm || searchTerm.length === 0) return;
    searchError = null;
    searchTerm = null;
    fetchCustomer = null;
    selectActive = "active";
    await fetchCustomers();
  };

  /**
   * Handle the controlled input field
   *
   * @param {object} ev Event emitted
   * @function handleSearchTerm
   */
  const handleSearchTerm = async (ev) => {
    const input = document.querySelector("#searchTerm");
    searchTerm = input.value.trim();
    searchError = null;
    const button = document.querySelector("button[name='Search'");
    if (button) button.blur();
    if (searchTerm.length > 0 && ev.key === "Enter") {
      selectActive = "all";
      await fetchCustomers();
      return;
    };
    await this.refresh();
  };

  fetchCustomers();

  const proxy_path = localStorage.getItem("proxy-path");
  const qs = localStorage.getItem("qs"); // query string to maintain access
  const cancelOptionsPath = `${proxy_path}/admin-portal/recharge/cancel-options${ qs }`;
  const bulkPauseSubscriptionsPath = `${proxy_path}/admin-portal/recharge/bulk-pause-subscriptions${ qs }`;
  /**
   * Side navigation menu
   *
   * @member sideMenu
   * @type {array}
   */
  const sideMenu = [
    <div onclick={() => window.location = cancelOptionsPath}>
      <IconButton
         name="Cancel Options"
         title="Cancel Options">
        <span style="width: 250px" class="db tl link white pv1 pl3 pr2">Cancel Options</span>
      </IconButton>
    </div>,
    <div onclick={() => window.location = bulkPauseSubscriptionsPath}>
      <IconButton
         name="Bulk Pause"
         title="Bulk Pause">
        <span style="width: 250px" class="db tl link white pv1 pl3 pr2">Bulk Pause</span>
      </IconButton>
    </div>,
  ];

  this.addEventListener("toastEvent", Toaster);

  for await (const props of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="w-100 pa2" id="subscriptions">
        <PushMenu children={sideMenu} />
        <div class="pl5" style="margin-top: -25px">
          <h4 class="pt0 lh-title ma0 mb4 fg-streamside-maroon" id="boxes-title">
            Recharge Customers {""}
            { fetchCustomer ? (
              <span class="ml4">
                {fetchCustomer.first_name} {fetchCustomer.last_name} &lt;{fetchCustomer.email}&gt;
              </span>
            ) : (
              <span style="font-size: smaller;" class="ml4">
                { pageSize && customerCount > pageSize && <span>{ pageSize } of</span> } {" "}
                { customerCount && <span>{ customerCount }</span> }
              </span>
            )}
          </h4>
        </div>
        { fetchError && <Error msg={fetchError} /> }
        { !fetchCustomer && (
          <Fragment>
            <div class="alert-box cf dark-blue pa4 mt2 mb4 br3 ba b--dark-blue bg-washed-blue">
              Customers here may not be synchronised to Recharge customers. They are updated nightly.{" "}
              But things may have changed since then, you can resynchronize the customer with the icon link beside the name.{" "}
              This is recommended if you choose to open and individual charge.
            </div>
            <div class="w-100 flex-container">
              <div class="w-30 v-bottom tl flex">
                <div class="w-100 flex-container">
                  <div class="w-70 flex">
                    <input 
                      class="dib pa0 mr2 ba bg-transparent hover-bg-near-white w-100 input-reset br2"
                      style="padding: 0 6px"
                      type="text"
                      valid={ !searchError }
                      id="searchTerm"
                      onkeydown={ (ev) => handleSearchTerm(ev) }
                      value={ searchTerm && searchTerm }
                      placeholder={`id, first or last name`}
                      name="searchTerm" />
                  </div>
                  <div class="w-30 flex pl3" style="height: 1.8em">
                    <div onclick={ () => handleSearchTerm({key: "Enter"}) }>
                      <IconButton color="dark-gray" title="Search" name="Search">
                        <SearchIcon />
                      </IconButton>
                    </div>
                    <div onclick={ () => clearSearchTerm() }>
                      <IconButton color="dark-gray" title="Clear Search" name="Clear Search">
                        <ClearSearchIcon />
                      </IconButton>
                    </div>
                  </div>
                </div>
                { searchError && (
                  <div class="alert-box dark-blue ma2 br3 ba b--dark-blue bg-washed-blue">
                    <p class="tc">{ searchError }</p>
                  </div>
                )}
              </div>
              <div class="w-70 v-bottom tr">
                <button
                  class={
                    `${
                        selectActive === "active" ? "white bg-black-80" : "grey bg-white bg-animate hover-bg-light-gray"
                      } dib w-25 pv1 outline-0 b--grey ba br2 br--right br--left mv1 pointer`
                    }
                  title="Active Subscriptions"
                  type="button"
                  onclick={() => changeSelectActive("active")}
                  >
                    <span class="v-mid di">Has active subscriptions</span>
                </button>
                <button
                  class={
                    `${
                        selectActive === "none-active" ? "white bg-black-80" : "grey bg-white bg-animate hover-bg-light-gray"
                      } dib w-25 pv1 outline-0 b--grey bt bb br bl-0 br2 br--right br--left mv1 pointer`
                    }
                  title="All Subscriptions"
                  type="button"
                  onclick={() => changeSelectActive("none-active")}
                  >
                    <span class="v-mid di">No active subscriptions</span>
                </button>
                <button
                  class={
                    `${
                        selectActive === "all" ? "white bg-black-80" : "grey bg-white bg-animate hover-bg-light-gray"
                      } dib w-25 pv1 outline-0 b--grey bt bb br bl-0 br2 br--right br--left mv1 pointer`
                    }
                  title="All Subscriptions"
                  type="button"
                  onclick={() => changeSelectActive("all")}
                  >
                    <span class="v-mid di">All</span>
                </button>
              </div>
            </div>
          </Fragment>
        )}
        <div class="ma1"><br /></div>
        { loading && <BarLoader /> }
        { loading && (
          <div class="alert-box dark-blue pv2 ph4 mv2 br3 ba b--dark-blue bg-washed-blue">
            <p>
              <i class="b">Hold tight.</i> Collecting { loadingLabel }, sorting, and verifying subscriptions.{" "}
            </p>
          </div>
        )}
        { false && (
            <Customer customer={ fetchCustomer } charge={ customerCharge } admin={ true } /> 
        )}
        { fetchCustomer && (
            <Customer customer={ fetchCustomer } charge_id={customerCharge} admin={ true } /> 
        )}
        { !fetchCustomer && (
          <Fragment>
            { updatesPending && updatesPending.length > 0 && <PendingUpdates pendingUpdates={ updatesPending } /> }
            { faultySubscriptions && faultySubscriptions.length > 0 && <VerifySubscriptions customers={ faultySubscriptions } /> }
            { rechargeCustomers && (
              <Fragment>
                { rechargeCustomers.length > 0 && (
                  <Pagination callback={ movePage } pageCount={ parseInt(pageCount) } pageNumber={ parseInt(pageNumber) } />
                )}
                { rechargeCustomers.length === 0 && searchTerm && (
                  <div class="orange pa2 mv2 br3 ba b--orange bg-light-yellow">
                    None found for your search term <b>{ searchTerm }</b>.
                  </div>
                )}
                <table id="customer-table" class={ `mt4 w-100 center${ loading ? " disableevents" : "" }` } cellspacing="0">
                  { rechargeCustomers.length > 0 && (
                    <Fragment>
                      <thead>
                        <tr>
                          <th class="fw6 bb b--black-20 tl pb3 pr1 bg-white">{ "" }</th>
                          <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Customer</th>
                          <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Email</th>
                          <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Recharge</th>
                          <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Shopify</th>
                          <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Upcoming (charge date)</th>
                        </tr>
                      </thead>
                      <tbody class="tl">
                        { rechargeCustomers.map((customer, idx) => (
                          <tr crank-key={ `${ customer.last_name }-${ idx }` }>
                            <td class="pr1 pt1 bb b--black-20 v-top">
                              <div onclick={ () => updateRechargeCustomer(customer.recharge_id) }>
                                <IconButton color="fg-streamside-blue" title="Sync"
                                  name="Sync" id={`sync-${customer.recharge_id}`}>
                                  <SyncIcon />
                                </IconButton>
                              </div>
                            </td>
                            <td class="pr3 pt1 bb b--black-20 v-top">
                              <div class="w-100">
                                <div class="pa3 ml2 pointer hover-black hover-bg-near-white fg-streamside-blue b w-100"
                                  title="Show customer subscriptions"
                                  onclick={ () => fetchRechargeCustomer(customer.recharge_id) }>
                                  { customer.first_name } { customer.last_name }
                                </div>
                              </div>
                            </td>
                            <td class="pr3 pt1 bb b--black-20 v-top">
                              <div class="w-100">
                                <div class="pa3 ml2 pointer hover-black hover-bg-near-white fg-streamside-blue b w-100"
                                  title="Show customer subscriptions"
                                  onclick={ () => fetchRechargeCustomer(customer.recharge_id) }>
                                  { customer.email }
                                </div>
                              </div>
                            </td>
                            <td class="pr3 pt1 bb b--black-20 v-top">
                              <a href={ `${ rechargeAdminUrl }/${ customer.recharge_id }` }
                                class="dim fg-streamside-blue no-underline"
                                target="_blank"
                                title="View customer in recharge admin">
                                { customer.recharge_id }
                              </a>
                            </td>
                            <td class="pr3 pt1 bb b--black-20 v-top">
                              <a href={ `${ shopAdminUrl }/${ customer.shopify_id }` }
                                class="dim fg-streamside-blue no-underline"
                                target="_blank"
                                title="View customer in shopify admin">
                                { customer.shopify_id }
                              </a>
                            </td>
                            <td class="pr3 pt1 bb b--black-20 v-top">
                              <div class="dt w-100">
                                { customer.charge_list.map((charge, idx) => (
                                  <div class="dt-row pb1 pointer hover-black hover-bg-near-white fg-streamside-blue b"
                                      title={ `Load charge #${charge[0]}` }
                                      onclick={ () => fetchCustomerCharge(customer, charge[0]) }>
                                    <div class="dtc mv1 pl2">
                                      { charge[0] }
                                    </div>
                                    <div class="dtc mv1 pl2 dark-grey">
                                      { charge[1] }
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Fragment>
                  )}
                </table>
              </Fragment>
            )}
          </Fragment>
        )}
        <script type="text/javascript">
          if (document.getElementById("searchTerm")) document.getElementById("searchTerm").focus();
        </script>
      </div>
    )
  };
};

//https://southbridge-dev-sp.admin.rechargeapps.com/merchant/customers/
//https://....myshopify.com/customes
export default Customers;
