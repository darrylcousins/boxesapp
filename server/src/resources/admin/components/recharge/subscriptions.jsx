/**
 * Creates element to render recharge subsciptions
 *
 * @module app/recharge/subscriptions
 * @requires module:app/recharge/subscriptions~Subscriptions
 * @exports Subscriptions
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import { Fetch } from "../lib/fetch";
import Customer from "./customer";

/**
 * Create subscription listing
 *
 * @generator
 * @yields {Element} - a html table display of the boxes
 */
function* Subscriptions() {

  /**
   * True while loading data from api
   * Starts false until search term submitted
   *
   * @member {boolean} loading
   */
  let loading = false;
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
    document.querySelector("#searchTerm").focus();
  };
  this.addEventListener("loadAnotherCustomer", getNewCustomer);

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
            console.log('got customer', result);
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

  for (const props of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="w-100 pb2 center" id="subscriptions">
        <h4 class="pt0 lh-title ma0 fg-streamside-maroon" id="boxes-title">
          Recharge Subscriptions {""}
          { fetchCustomer && (
            <span style="font-size: smaller;" class="ml4">
              {fetchCustomer.first_name} {fetchCustomer.last_name} &lt;{fetchCustomer.email}&gt;
            </span>
          )}
        </h4>
        { loading && <BarLoader /> }
        { loading && <div>Loading customer ...</div> }
        { fetchError && <Error msg={fetchError} /> }
        { fetchCustomer ? (
            <Customer customer={ fetchCustomer } admin={ true } /> 
        ) : (
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
        <script type="text/javascript">
          document.getElementById("searchTerm").focus();
        </script>
      </div>
    )
  };
};

export default Subscriptions;
