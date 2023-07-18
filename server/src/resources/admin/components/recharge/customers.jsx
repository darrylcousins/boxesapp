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
import { Fetch } from "../lib/fetch";
import IconButton from "../lib/icon-button";
import PushMenu from "../lib/push-menu";
import Customer from "./customer";

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
  const shopAdmin = `https://${ localStorage.getItem("shop") }/admin/customers`;
  const rechargeAdmin = `https://${ localStorage.getItem("recharge") }.admin.rechargeapps.com/merchant/customers`;
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
   * The previous cursor
   *
   * @member {object|string} previousCursor
   */
  let previousCursor = null;
  /**
   * The nex cursor
   *
   * @member {object|string} nextCursor
   */
  let nextCursor = null;
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
   * The loaded customers from api
   *
   * @member {object|string} rechargeCustomers
   */
  let rechargeCustomers = null;

  /**
   * Helper method
   *
   * @function getBorders
   */
  const getBorders = (cursor) => {
    let borders = "ba";
    if (cursor === "previous") {
      if (!nextCursor) return "ba br2";
      return "ba br2 br--left";
    };
    if (cursor === "next") {
      if (!previousCursor) return "ba br2";
      return "bb br bt bl-0 br2 br--right";
    };
    if (position === "left") borders = "bb bl bt br-0 br2 br--left";
    if (position === "middle") borders = "bb br bt bl-0";
    if (position === "middle-left") borders = "ba";
    if (position === "middle-right") borders = "bb br bt bl-0";
    if (position === "right") borders = "br bt bb bl-0 br2 br--right";
    if (position === "single") borders = "ba br2";
    return borders;
  };

  /**
   * Handle next/previous buttons
   *
   * @function clickEvent
   */
  const clickEvent = async (ev) => {
    let target = ev.target;
    const name = target.tagName.toUpperCase();
    if (name === "BUTTON") {
      target.blur();
      loading = true;
      await this.refresh();
      fetchCustomers();
    };
  };

  this.addEventListener("click", clickEvent);
  /**
   * Handle the event calling to load another customer
   *
   * @function getNewCustomer
   * @listens loadAnotherCustomer
   */
  const getNewCustomer = async () => {
    loading = false;
    searchError = null;
    searchTerm = null;
    fetchCustomer = null;
    await this.refresh();
    if (document.getElementById("searchTerm")) {
      document.querySelector("#searchTerm").focus();
    };
  };
  this.addEventListener("loadAnotherCustomer", getNewCustomer);

  /**
   * Fetch all customers on start
   *
   * @param {string} id The shopify customer id
   * @function fetchCustomers
   */
  const fetchCustomers = async () => {
    let cursor = nextCursor || previousCursor;
    //const uri = `/api/recharge-customers?cursor=${cursor}`;
    const uri = `/api/recharge-customers`;
    await Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        nextCursor = json.next_cursor;
        previousCursor = json.previous_cursor;
        rechargeCustomers = json.customers;
        loading = false;
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
   * Fetch recharge customer
   *
   * @param {string} id The recharge customer id
   * @function fetchRechargeCustomer
   */
  const fetchRechargeCustomer = async (customer_id) => {
    const uri = `/api/recharge-customer/${customer_id}`;
    console.log(uri);
    await Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        console.log(json);
        fetchCustomer = json;
        loading = false;
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
   * Fetch customer on search
   *
   * @param {string} id The shopify customer id
   * @function getCustomer
   */
  const getCustomer = async (id) => {
    // const id = 242071498;
    const parsed = parseInt(id, 10);
    if (Number.isNaN(parsed)) {
      searchError = "Not a valid number, the subscription id must be a number.";
      searchTerm = id;
      this.refresh();
      return;
    };
    loading = true;
    await this.refresh();
    const customer_id = parsed;
    const uri = `/api/shopify-customer/${customer_id}`;
    const customer = await Fetch(uri)
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          if (json.errors) {
            searchError = `No customer found with the given id. ${json.errors}`;
            return null;
          } else {

            const result = json.customer;
            if (!result) {
              searchError = "No customer found with the given id";
              return null;
            };
            return result;
          };
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
    fetchCustomer = customer;
    loading = false;
    await this.refresh();
  };

  /**
   * Handle the controlled input field
   *
   * @param {object} ev Event emitted
   * @function handleSearchTerm
   */
  const handleSearchTerm = async (ev) => {
    const input = document.querySelector("#searchTerm");
    searchTerm = input.value;
    searchError = null;
    await this.refresh();
    if(ev.key === 'Enter') {
      await getCustomer(input.value);
    }
  };

  fetchCustomers();

  for await (const props of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="w-100 pa2 center" id="subscriptions">
        <h4 class="pt0 lh-title ma0 fg-streamside-maroon" id="boxes-title">
          Recharge Customers {""}
          { fetchCustomer && (
            <span style="font-size: smaller;" class="ml4">
              {fetchCustomer.first_name} {fetchCustomer.last_name} &lt;{fetchCustomer.email}&gt;
            </span>
          )}
        </h4>
        { fetchError && <Error msg={fetchError} /> }
        { loading && <BarLoader /> }
        { fetchCustomer ? (
            <Customer customer={ fetchCustomer } admin={ true } /> 
        ) : (
          <Fragment>
            { false && (
              <div class="w-60 center mt3">
                <label style="font-size: 1em">
                  Search customers with the shopify customer id.
                    <a 
                      class="link ml2" 
                      target="_blank"
                      href={`https://${localStorage.getItem("shop")}/admin/customers`}>
                      (View a list in Shopify admin)
                    </a>
                  <input 
                    class="mt2 pa2 ba bg-transparent hover-bg-near-white w-100 input-reset br2"
                    type="text"
                    valid={ !searchError }
                    id="searchTerm"
                    onkeydown={ (ev) => handleSearchTerm(ev) }
                    value={ searchTerm && searchTerm }
                    name="searchTerm" />
                </label>
                { searchError && (
                  <div class="dark-blue ma2 br3 ba b--dark-blue bg-washed-blue">
                    <p class="tc">{ searchError }</p>
                  </div>
                )}
              </div>
            )}
            <div class="db tr">
              { previousCursor && (
                <button
                  title="Previous"
                  name="previous"
                  type="button"
                  class={`dark-grey b--dark-grey bg-transparent ph2 pv1 dim pointer ${getBorders("previous")}`}
                >Previous</button>
              )}
              { nextCursor && (
                <button
                  title="Next"
                  type="button"
                  name="next"
                  class={`dark-grey b--dark-grey bg-transparent ph2 pv1 dim pointer ${getBorders("next")}`}
                >Next</button>
              )}
            </div>
            { rechargeCustomers && (
              <Fragment>
                <table class="mt4 w-100 mw9 center" cellspacing="10">
                  <thead>
                    <tr>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Customer</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Email</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Recharge</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Shopify</th>
                    </tr>
                  </thead>
                { rechargeCustomers.map((customer, idx) => (
                  <tr crank-key={ `${ customer.last_name }-${ idx }` }>
                    <td class="pr3 bb b--black-20">
                      <div class="dt w-100">
                        <div class="ml2 dt-row pointer hover-black hover-bg-near-white fg-streamside-blue b w-100"
                          title="Show customer subscriptions"
                          onclick={ () => fetchRechargeCustomer(customer.recharge_id) }>
                          <div class="dtc w-100">
                            <div class="dib w-50 mv2 pl2">
                              { customer.last_name }
                            </div>
                            <div class="dib w-50 mv2 pl2">
                              { customer.first_name }
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="pv3 pr3 bb b--black-20">
                      <div class="dt w-100">
                        <div class="ml2 dt-row pointer hover-black hover-bg-near-white fg-streamside-blue b w-100"
                          title="Show customer subscriptions"
                          onclick={ () => fetchRechargeCustomer(customer.recharge_id) }>
                          <div class="dtc w-100">
                            <div class="dib w-100 mv2 pl2">
                              { customer.email }
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="pv3 pr3 bb b--black-20">
                      <a href={ `${ rechargeAdmin }/${ customer.recharge_id }` }
                        class="dim fg-streamside-blue no-underline"
                        target="_blank"
                        title="View customer in recharge admin">
                        { customer.recharge_id }
                      </a>
                    </td>
                    <td class="pv3 pr3 bb b--black-20">
                      <a href={ `${ shopAdmin }/${ customer.shopify_id }` }
                        class="dim fg-streamside-blue no-underline"
                        target="_blank"
                        title="View customer in shopify admin">
                        { customer.shopify_id }
                      </a>
                    </td>
                  </tr>
                ))}
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
