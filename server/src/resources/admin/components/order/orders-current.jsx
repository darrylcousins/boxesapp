/**
 * Creates element to render html display of order listing, tabbed by delivery date.
 *
 * @module app/components/order-current
 * @exports CurrentOrders
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import AddOrderModal from "./order-add";
import FilterOrders from "./orders-filter";
import EditOrders from "./orders-edit";
import HelpSection from "./order-help";
import PackingModal from "./packing-modal";
import PickingModal from "./picking-modal";
import { TableHeader, TableBody } from "./order-table";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import SelectMenu from "../lib/select-menu";
import { Fetch } from "../lib/fetch";
import Button from "../lib/button";
import { Help } from "../lib/help";
import { SaveAltIcon } from "../lib/icon";
import { animateFadeForAction, hasOwnProp, dateStringSort } from "../helpers";

/**
 * Create a DOM representation of orders grouped using tabs by delivery date.
 * Orders are fetched from the api using {@link
 * module:app/lib/fetch~Fetch|Fetch}
 *
 * @generator
 * @yields {Element} DOM element displaying orders
 */
function* CurrentOrders() {
  /**
   * Orders fetched from api as array for the selectedDate
   *
   * @member {object} fetchOrders
   */
  let fetchOrders = [];
  /**
   * Delivery dates - the array of dates from fetchDates
   *
   * @member {object} fetchDates
   */
  let fetchDates = [];
  /**
   * Order counts object keyed by delivery date
   *
   * @member {object} orderCounts
   */
  let orderCounts = {};
  /**
   * If fetch returns an error
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;
  /**
   * Headers fetched from api
   *
   * @member {Array} fetchHeaders
   */
  let fetchHeaders = [];
  /**
   * True while loading data from api
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Select date for order display table
   *
   * @member {boolean} selectedDate
   */
  let selectedDate = null;
  /**
   * Display date selection menu if active
   *
   * @member menuSelectDate
   * @type {boolean}
   */
  let menuSelectDate = false;
  /**
   * Available form filter fields
   *
   * @member {boolean} filterFields
   */
  let filterFields = {
    pickup: 'Pickup Date',
  };
  /**
   * Form filter field
   *
   * @member {boolean} filterField
   */
  let filterField = null;
  /**
   * Form filter value
   *
   * @member {boolean} filterValue
   */
  let filterValue = null;
  /**
   * Maintain array of checked orders
   *
   * @member {boolean} checkedOrders
   */
  let checkedOrders = [];

  /**
   * Fetch available dates, includes order count by date
   *
   * @function getDates
   */
  const getDates = () => {
    const uri = `/api/current-order-dates`;
    Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          console.error("fetch error:", fetchError);
          loading = false;
          this.refresh();
        } else {
          fetchDates = Object.keys(json);
          fetchDates.sort(dateStringSort);
          orderCounts = {};
          for (const d of fetchDates) {
            if (hasOwnProp.call(json[d], 'orders')) {
              orderCounts[d] = json[d].orders;
            } else {
              orderCounts[d] = 0;
            };
          };
          if (!selectedDate || !fetchDates.includes(selectedDate)) {
            if (fetchDates.length) selectedDate = fetchDates[fetchDates.length - 1];
          }
          getOrders();
        }
      })
      .catch((err) => {
        fetchError = err;
        console.error("wtf fetch error:", fetchError);
        loading = false;
        this.refresh();
      });
  };

  /**
   * Return updated uri for fetching if filters are set
   *
   * @function getUriFilters
   */
  const getUriFilters = (uri, includeProxy) => {
    if (filterField && filterValue) {
      uri += `?filter_field=${encodeURIComponent(filterField)}&filter_value=${encodeURIComponent(filterValue)}`;
    };
    if (includeProxy) {
      const proxy = localStorage.getItem("proxy-path");
      uri = `${proxy}${uri}`;
    };
    return uri;
  };

  /**
   * Fetch orders data on mounting of component use the closest next date
   *
   * @function getOrders
   */
  const getOrders = () => {
    loading = true;
    this.refresh();
    let uri = getUriFilters(`/api/current-orders-by-date/${new Date(selectedDate).getTime()}`, false);
    Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          console.error("1 fetch error:", fetchError);
          loading = false;
          this.refresh();
        } else {
          const { headers, orders } = json;
          fetchHeaders = headers;
          fetchOrders = orders;
          loading = false;
          if (document.getElementById("orders-table")) {
            animateFadeForAction("orders-table", async () => await this.refresh());
          } else {
            this.refresh();
          };
        }
      })
      .catch((err) => {
        fetchError = err;
        console.error("2 fetch error:", fetchError);
        loading = false;
        this.refresh();
      });
  };

  getDates();

  /*
   * Close menu
   * @function closeMenu
   */
  const closeMenu = () => {
    if (menuSelectDate) {
      // close menu on all clicks not captured
      menuSelectDate = !menuSelectDate;
      this.refresh();
    };
  };

  /**
   *
   * @function clickEvent
   * @param {object} ev Click event
   * @listens window.click
   */
  const clickEvent = async (ev) => {
    const name = ev.target.tagName;
    if (name === "BUTTON") {

      switch(ev.target.id) {
        case "selectDate":
          // open and close date select dropdown
          menuSelectDate = !menuSelectDate;
          this.refresh()
          break;
        default:
          if (menuSelectDate) {
            // close menu on all clicks not captured
            closeMenu();
          };
      }
    } else if (ev.target.getAttribute("name") === "selectDate") {

      const date = ev.target.getAttribute("data-item");
      menuSelectDate = false;
      if (date !== selectedDate) {
        selectedDate = date;
        clearFilter();
      } else {
        this.refresh();
      };

    } else if (name === "INPUT") {
      // pickes up order checkboxes
      //const initialCheckedOrdersLength = checkedOrders.length;
      if (ev.target.name.startsWith("order")) {
        if (ev.target.checked) {
          checkedOrders.push(ev.target.id);
        } else {
          const idx = checkedOrders.indexOf(ev.target.id);
          if (idx > -1) checkedOrders.splice(idx, 1);
        };
        this.refresh();
      };
    } else {
      // close menu
      if (menuSelectDate) {
        menuSelectDate = !menuSelectDate;
        this.refresh();
      }
    };
  };

  document.addEventListener("click", clickEvent);

  // close select menu on escape key
  document.addEventListener("keyup", (ev) => {
    if (ev.key && ev.key === "Escape" && menuSelectDate) {
      closeMenu();
    }
  });

  /**
   * Hide the select dropdown on escape key
   *
   * @function hideModal
   * @param {object} ev Event emitted
   * @listens window.keyup
   */
  const keyEvent = async (ev) => {
    if (ev.key && ev.key === "Escape") {
      if (menuSelectDate) {
        menuSelectDate = !menuSelectDate;
        this.refresh();
      }
    }
  };

  this.addEventListener("keyup", keyEvent);

  /**
   * Event handler when {@link
   * module:form/form-modal~FormModalWrapper|FormModalWrapper} saves the data
   *
   * @function reloadOrders
   * @param {object} ev The event
   * @listens listing.reload
   */
  const reloadOrders = (ev) => {
    getDates();
  };

  this.addEventListener("listing.reload", reloadOrders);

  /**
   * Clear selected items
   *
   * @function clearSelected
   */
  const clearSelected = () => {
    checkedOrders = [];
    const s = document.querySelectorAll("input[name^=order]:checked");
    s.forEach(el => el.checked = false);
    this.refresh();
  };

  /**
   * Helper method to pluralize a word
   * Doesn't account for 'es' as pluralize
   *
   * @function pluralize
   */
  const pluralize = (count, word) => {
    if (count === 1) return word;
    return word + "s";
  };

  /**
   * Return count for orders on delivery date for use in loop
   *
   * @function getOrderCount
   * @param {string} key Delivery date as key
   * @returns {number} Array length
   */
  const getOrderCount = (key) => orderCounts[key];

  /**
   * Return count of headers
   *
   * @function getHeaderCount
   * @returns {number} Length of headers array
   */
  const getHeaderCount = () => fetchHeaders.length;

  /**
   * Returns array of headers
   *
   * @function getHeaders
   * @returns {number} Array length
   */
  const getHeaders = () => fetchHeaders;

  /**
   * Update fetch list of orders with field filter
   *
   * @function updateFilter
   */
  const updateFilter = (args) => {
    filterField = args.filter_field;
    filterValue = args.filter_value;
    getOrders();
  };

  /**
   * Clear field filter
   *
   * @function clearFilter
   */
  const clearFilter = () => {
    filterField = null;
    filterValue = null;
    getOrders();
  };

  /**
   * Normalize value if filtering on a date
   *
   * @function normalizeFilterValue
   */
  const normalizeFilterValue = (value) => {
    const testDate = new Date(parseInt(value));
    return (!Boolean(testDate)) ? value : testDate.toDateString();
  };

  /*
   * Helper for the SelectMenu
   */
  const Item = ({text, item}) => {
    return <span name="selectDate" data-item={ item }>{text}</span>;
  };

  for (const _ of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="w-100 pb2 center">
        <h4 class="pt0 lh-title ma0 fg-streamside-maroon" id="boxes-title">
          Current Orders {selectedDate ? `for ${selectedDate}` : ""}
        </h4>
        <p class="lh-copy">
          {loading ? (
            <div class="ba br2 pa3 mh2 mv1 orange bg-light-yellow" role="alert">
              <p>
                <i class="b">Hold tight.</i> Collecting and collating{" "}
              </p>
            </div>
          ) : (
            <div class="relative w-100 tr pr2">
              <Help id="ordersInfo" />
              <div id="ordersInfo" class="info w-95" role="alert">
                <ul>
                <li>
                Orders are removed two weeks after delivery date. A back up file will be available for a short time thereafter.
                </li>
                <li>
                Orders past delivery date cannot be deleted or edited.
                </li>
              </ul>
              </div>
            </div>
          )}
        </p>
        { hasOwnProp.call(orderCounts, "No delivery date") && (
          <p class="w-95 ba br2 pa3 mh2 mv1 red bg-washed-red" role="alert">
            <strong>Note!</strong> We have <b>{ orderCounts["No delivery date"] }</b> {pluralize(orderCounts["No delivery date"], "order")} recorded with no delivery date, this will need attention.
          </p>
        )}
        {loading && <BarLoader />}
        {!loading && false && (
          <div class="relative">
            <HelpSection>
            </HelpSection>
          </div>
        )}
        <div class="overflow-visible">
          {fetchError && <Error msg={fetchError} />}
          {checkedOrders.length ? (
            <div class="ba br2 pa3 mh2 mv1 orange bg-light-yellow" role="alert">
              <p class="fl w-50">
                <strong>{checkedOrders.length}</strong> {pluralize(checkedOrders.length, "order")} selected.
              </p>
              <div class="w-50 tr dib">
                <EditOrders selectedOrders={checkedOrders} />
                <Button
                  type="secondary"
                  onclick={clearSelected}
                >Clear Selected</Button>
              </div>
            </div>
          ) : ""}
          <div class="w-100 flex fg-streamside-maroon">
            {fetchDates.length > 0 && (
              <div class="tr v-mid w-30 fl pr2">
                <SelectMenu
                  id="selectDate"
                  menu={fetchDates.map(el => ({text: <Item text={`${el} (${getOrderCount(el)})`} item={ el } />, item: el, title: el}))}
                  title="Select Delivery Date"
                  active={menuSelectDate}
                  style={{border: 0, color: "brown", "font-size": "1.2em"}}
                >
                  { selectedDate ? `${selectedDate} (${getOrderCount(selectedDate)})` : "Select delivery date" }&nbsp;&nbsp;&nbsp;&#9662;
                </SelectMenu>
              </div>
            )}
            {selectedDate && (
              <Fragment>
                {new Date(selectedDate).toString() !== "Invalid Date" && (
                  <div class="flex w-70 tr v-bottom relative">
                    <FilterOrders updateFilter={updateFilter} />
                    <PickingModal delivered={selectedDate} getUriFilters={getUriFilters}/>
                    <PackingModal delivered={selectedDate} getUriFilters={getUriFilters}/>
                    <button
                      class={`dib w-20 outline-0 green b--dark-green bt bb br bl-0 bg-transparent mv1 pointer`}
                      title="Download packing list"
                      type="button"
                      onclick={() => window.location=getUriFilters(`/api/list-download/${new Date(
                        selectedDate
                      ).getTime()}`, true)}
                      >
                        <span class="v-mid di">Lists</span>
                        <span class="v-mid">
                          <SaveAltIcon />
                        </span>
                    </button>
                    <button
                      class={`dib w-20 outline-0 orange b--dark-green bt bb br bl-0 br2 br--right bg-transparent mv1 pointer`}
                      title="Download orders"
                      type="button"
                      onclick={() => window.location=getUriFilters(`/api/orders-download/${new Date(
                        selectedDate
                      ).getTime()}`, true)}
                      >
                        <span class="v-mid di">Orders</span>
                        <span class="v-mid">
                          <SaveAltIcon />
                        </span>
                    </button>
                  </div>
                )}
                <div class="w-0 tr v-mid dib">
                  <AddOrderModal delivered={selectedDate} />
                </div>
              </Fragment>
            )}
          </div>
          <div class="cf"></div>
          {filterField && filterValue && (
            <div class="ba br2 pa3 ma2 orange bg-light-yellow" role="alert">
              {fetchOrders.length ? (
                <p class="fl w-50">
                  Filtered <strong>{fetchOrders.length}</strong> orders by <strong>{filterFields[filterField]}</strong> for <strong>{normalizeFilterValue(filterValue)}</strong>.
                </p>
              ) : (
                <p class="fl w-50">
                  No orders found filtering on <strong>{filterFields[filterField]}</strong> by <strong>{normalizeFilterValue(filterValue)}</strong>.
                </p>
              )}
              <div class="w-50 tr dib">
                <Button
                  type="secondary"
                  onclick={clearFilter}
                >Clear Filter</Button>
              </div>
            </div>
          )}
          {selectedDate && (
            <div class="mt2">
              <div class="cf">&nbsp;</div>
              <table class="tl mt2 w-100 dark-gray center table-striped" cellSpacing="0">
                {getHeaderCount() ? (
                  <TableHeader
                    crank-key={`${selectedDate}-th`}
                    headers={getHeaders()}
                  />
                ) : null }
                {getOrderCount(selectedDate) ? (
                  <TableBody
                    crank-key={`${selectedDate}-tb`}
                    orders={fetchOrders}
                    selected={checkedOrders}
                  />
                ) : (
                  <div class="ba br2 pa3 mh2 mv1 orange bg-light-yellow" role="alert">
                    <p>
                      No orders here.
                    </p>
                  </div>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default CurrentOrders;
