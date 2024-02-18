/**
 * Render current logs
 *
 * @module app/components/logs-current
 * @exports CurrentLogs
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import { Fetch } from "../lib/fetch";
import SelectMenu from "../lib/select-menu";
import Pagination from "../lib/pagination";
import Help from "../lib/help";
import Toaster from "../lib/toaster";
import { toastEvent } from "../lib/events";
import { titleCase, animateFadeForAction, formatDate } from "../helpers";
import IconButton from "../lib/icon-button";
import { SearchIcon, ClearSearchIcon, SyncIcon } from "../lib/icon";
import { formatMeta, possibleObjects, dateString } from "./helpers";

/**
 * Uses fetch to collect current boxes from api and then passes data to
 * {@link module:app/boxes} to display as a table.
 * 
 * **timestamp** allows preload of particular date - see initialize
 *
 * @generator
 * @yields {Element}
 */
function* CurrentLogs() {

  /**
   * Which log level to view, always start with notice
   *
   * @member logLevel
   * @type {string}
   */
  let logLevel = "notice";
  /**
   * Select menu to filter on meta[object]
   *
   * @member menuSelectObject
   * @type {Boolean}
   */
  let menuSelectObject = false;
  /**
   * Selected object to filter on 'order', 'product' etc
   *
   * @member selectedObject
   * @type {string}
   */
  let selectedObject = null;
  /**
   * Display loading indicator while fetching data
   *
   * @member loading
   * @type {boolean}
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
   * Logs fetched from api for the filters
   *
   * @member {object} fetchLogs
   */
  let fetchLogs = [];
  /**
   * If fetching data was unsuccessful.
   *
   * @member fetchError
   * @type {object|string|null}
   */
  let fetchError = null;
  /**
   * Capture oldestDate from api
   *
   * @member oldestDate
   * @type {object|null}
   */
  let oldestDate;
  /**
   * Capture fromDate
   *
   * @member fromDate
   * @type {object|null}
   */
  let fromDate = formatDate(new Date(0));
  /**
   * Capture toDate
   *
   * @member toDate
   * @type {object|null}
   */
  let toDate = formatDate(new Date());
  /**
   * Capture pageSize
   *
   * @member pageSize
   * @type {object|null}
   */
  let pageSize;
  /**
   * Capture count of fetch objects
   *
   * @member fetchCount
   * @type {object|null}
   */
  let fetchCount;
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

  /*
   * Close menu
   * @function closeMenu
   */
  const closeMenu = () => {
    if (menuSelectObject) {
      // close menu on all clicks not captured
      menuSelectObject = !menuSelectObject;
      this.refresh();
    };
  };

  /**
   * Handle click events
   *
   * @function clickEvent
   * @param {object} ev Click event
   * @listens window.click
   */
  const clickEvent = async (ev) => {
    let target = ev.target;
    const name = target.tagName.toUpperCase();
    if (name === "BUTTON") {
      if (target.id === "selectObject") {
        menuSelectObject = !menuSelectObject;
        this.refresh();
      } else {
        closeMenu(); // close on any other click event
      };
    } else if (name === "DIV") {
      const item = target.getAttribute("data-item");
      if (possibleObjects.includes(item)) {
        if (item === "all") {
          selectedObject = null;
        } else {
          selectedObject = item;
        };
        await refreshLogs();
      };
      closeMenu();
    } else if (name !== "SVG") { // clicking the search button
      closeMenu();
    };
  };

  document.addEventListener("click", clickEvent);

  // close select menu on escape key
  document.addEventListener("keyup", (ev) => {
    if (ev.key && ev.key === "Escape" && menuSelectObject) {
      closeMenu();
    }
  });

  const movePage = async (page) => {
    pageNumber = parseInt(page.pageTarget);
    return await refreshLogs();
  };

  /**
   * Fetch log data on mounting of component
   *
   * @function getLogs
   */
  const getLogs = () => {
    let uri = `/api/current-logs/${pageNumber}`;
    uri = logLevel ? `${uri}/${logLevel}` : `${uri}/all`;
    if (selectedObject) {
      uri = `${uri}/${selectedObject}`;
    };
    if (searchTerm) {
      uri = `${uri}/${encodeURIComponent(searchTerm)}`;
    };
    uri = `${uri}?from=${ Date.parse(fromDate) }&to=${ Date.parse(toDate) }`;
    console.log(encodeURI(uri));
    Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          loading = false;
          fetchError = false;
          pageCount = json.pageCount;
          pageNumber = json.pageNumber;
          fetchLogs = json.logs;
          fetchCount = json.count;
          pageSize = json.pageSize;
          oldestDate = json.oldestDate;
          if (Date.parse(oldestDate) > Date.parse(fromDate)) {
            fromDate = oldestDate;
            this.dispatchEvent(toastEvent({
              notice: `Oldest logs are from ${oldestDate}.`,
              bgColour: "black",
              borderColour: "black"
            }));
          };
          if (document.getElementById("logs-table")) {
            animateFadeForAction("logs-table", async () => await this.refresh());
          } else {
            this.refresh();
          };
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  /**
   * Handle changes to search dates
   *
   * @function searchDates
   */
  const searchDates = async (direction, ev) => {
    ev.target.blur();
    let from;
    let to;
    let el;
    if (direction === "from") {
      el = document.getElementById("to-date");
      to = Date.parse(el.value);
      from = Date.parse(ev.target.value);
    } else if (direction === "to") {
      el = document.getElementById("from-date");
      from = Date.parse(el.value);
      to = Date.parse(ev.target.value);
    };
    // add a day to the to date to get the correct range used in the query
    const dateTo = new Date(to);
    dateTo.setDate(dateTo.getDate() + 1);

    let fromTemp;
    let toTemp;
    if (dateTo.getTime() <= from) {
      console.log("to cannot be later than from");
      // need propert alert box
      this.dispatchEvent(toastEvent({
        notice: `To date ${formatDate(new Date(to))} cannot be earlier than from date ${formatDate(new Date(from))}.`,
        bgColour: "black",
        borderColour: "black"
      }));
      this.refresh();
      return;
    } else {
      fromTemp = formatDate(new Date(from));
      toTemp = formatDate(new Date(to));
      if (fromTemp !== fromDate || toTemp !== toDate) {
        fromDate = fromTemp;
        toDate = toTemp;
        // and collect the data
        return getLogs(); // refreshed on fetch
      };
    };
    this.refresh();
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
      //input.focus();
    };
    if (!searchTerm || searchTerm.length === 0) return;
    searchError = null;
    searchTerm = null;
    selectedObject = null;
    logLevel = "notice";
    await refreshLogs();
  };

  /**
   * Handle the controlled input field
   *
   * @param {object} ev Event emitted
   * @function handleSearchTerm
   */
  const handleSearchTerm = (ev) => {
    const input = document.querySelector("#searchTerm");
    searchTerm = input.value.trim();
    searchError = null;
    const button = document.querySelector("button[name='Search'");
    if (button) button.blur();
    if (searchTerm.length > 0 && ev.key === "Enter") {
      if (selectedObject) {
        logLevel = "notice";
        return getLogs();
      } else {
        logLevel = "notice";
        menuSelectObject = true;
      }
    };
    return this.refresh();
  };

  getLogs();

  /**
   * Refresh logs
   *
   * @function refreshLogs
   */
  const refreshLogs = async () => {
    loading = true;
    await this.refresh();
    getLogs();
  };

  /**
   * Filter collection on a log level
   *
   * @function changeLevel
   */
  const changeLevel = async (level) => {
    logLevel = level;
    if (logLevel === "error") selectedObject = null;
    await refreshLogs();
  };

  /*
   * Helper method
   */
  const getMetaObject = (el) => {
    if (!Object.hasOwnProperty.call(el, 'meta')) {
      return <div>&nbsp;</div>;
    };
    // expecting just one object on meta 'order', 'product', 'customer', 'subscription'?
    if (el.meta === null) {
      return <div>&nbsp;</div>;
    };
    let str;
    const obj = Object.keys(el.meta)[0];
    if (possibleObjects.includes(obj)) {
      str = obj.charAt(0).toUpperCase() + obj.slice(1);
    } else {
      str = "Error";
    };
    return <div class="bold">{ str }</div>;
  };

  /*
   * Helper method to render format level
   */
  const formatLevel = (el) => {
    let word = el;
    if (word.endsWith("s")) {
      word.replace("/s$/", "");
    };
    return titleCase(word);
  };

  this.addEventListener("toastEvent", Toaster);

  for (const _ of this) { // eslint-disable-line no-unused-vars

    yield (
      <div class="w-100 pb2">
        <h4 class="pt0 lh-title ma0 mb2 fg-streamside-maroon" id="boxes-title">
          { logLevel && formatLevel(logLevel) } Logs {" "}
          <span style="font-size: smaller;" class="ml4">
            { pageSize && fetchCount > pageSize && <span>{ pageSize } of</span> } {" "}
            { fetchCount && <span class="mr5">{ fetchCount }</span> } {" "}

            { oldestDate && <span>{"("}Oldest entry: { oldestDate }{")"}</span> } {" "}
            { fromDate && <span class="ml5">From: { fromDate }</span> } {" "}
            { toDate && <span> - To: { toDate }</span> } {" "}
          </span>
        </h4>
        {fetchLogs.length > 0 && (
          <Pagination callback={ movePage } pageCount={ parseInt(pageCount) } pageNumber={ parseInt(pageNumber) } />
        )}
        <div class="relative w-100 tr pr2">
          <Help id="logsInfo" />
          <p id="logsInfo" class="alert-box info info-right tr" role="alert">
            Only logs more recent than two days ago are available here.
          </p>
        </div>
        { searchError && (
          <div class="alert-box dark-blue ma2 br3 ba b--dark-blue bg-washed-blue">
            <p class="tc">{ searchError }</p>
          </div>
        )}
        <div class="w-100 flex-container">
          <div class="w-100 w-60-ns v-bottom tl">
            <div class="w-100 flex-container">
              <div class="w-70 flex">
                <div class="relative pt2">
                  <Help id="searchInfo" />
                  <p id="searchInfo" class="alert-box info info-left tl lh-copy" role="alert">
                      &#x2022; Recharge logs can be searched on customer_id, charge_id,
                      or subscription_id
                      <br />
                      &#x2022; Order logs can be searched on the shopify_order_id or the
                      order_number (e.g. #44444).
                  </p>
                </div>
                <input 
                  class="dib pa2 mr2 ba bg-transparent hover-bg-near-white w-100 input-reset br2"
                  type="text"
                  valid={ !searchError }
                  id="searchTerm"
                  onkeydown={ (ev) => handleSearchTerm(ev) }
                  value={ searchTerm && searchTerm }
                  placeholder={`customer or subscription id`}
                  name="searchTerm" />
              </div>
              <div class="w-30 flex" style="height: 1.8em">
                <div onclick={ () => handleSearchTerm({key: "Enter"}) } class="dib">
                  <IconButton color="dark-gray" title="Search" name="Search">
                    <SearchIcon />
                  </IconButton>
                </div>
                <div onclick={ () => clearSearchTerm() } class="dib">
                  <IconButton color="dark-gray" title="Clear Search" name="Clear Search">
                    <ClearSearchIcon />
                  </IconButton>
                </div>
              </div>
            </div>
          </div>
          <div class="w-100 w-10-ns v-bottom tr mr2">
              <SelectMenu
                id="selectObject"
                menu={possibleObjects.map(el => ({text: el, item: el}))}
                title="Filter by Object"
                active={menuSelectObject}
                style={{border: 1}}
              >
                { selectedObject ? `${selectedObject} messages` : "Filter by" }&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#9662;
              </SelectMenu>
          </div>
          <div class="w-100 w-40-ns v-bottom tr flex">
            <div class="w-50">
              <input
                class="mh1 pa2 ba bg-transparent hover-bg-near-white w-90 input-reset br2"
                type="date"
                value={ fromDate }
                id="from-date"
                onchange={(ev) => searchDates("from", ev)}
              />
            </div>
            <div class="w-50">
              <input
                class="ml1 mr0 pa2 ba bg-transparent hover-bg-near-white w-90 input-reset br2"
                type="date"
                value={ toDate }
                id="to-date"
                onchange={(ev) => searchDates("to", ev)}
              />
            </div>
          </div>
        </div>
        <div class="w-100 flex-container mt3">
          <div class="w-100 w-50-ns v-bottom tl">
            <button
              class={
                `${
                    logLevel === "notice" ? "white bg-black-80" : "grey bg-white bg-animate hover-bg-light-gray"
                  } dib w-third pv2 outline-0 b--grey ba br2 br--left mv1 pointer`
                }
              title="Notices"
              type="button"
              onclick={() => changeLevel("notice")}
              >
                <span class="v-mid di">Notices</span>
            </button>
            <button
              class={
                `${
                    logLevel === "error" ? "white bg-black-80" : "grey bg-white bg-animate hover-bg-light-gray"
                  } dib w-third pv2 outline-0 b--grey bt bb br bl-0 br2 br--right br--left mv1 pointer`
                }
              title="Errors"
              type="button"
              onclick={() => changeLevel("error")}
              >
                <span class="v-mid di">Errors</span>
            </button>
            <button
              class={
                `${
                    logLevel === "all" ? "white bg-black-80" : "grey bg-white bg-animate hover-bg-light-gray"
                  } dib w-third pv2 outline-0 b--grey bt bb br bl-0 br2 br--right br--left mv1 pointer`
                }
              title="Fatal"
              type="button"
              onclick={() => changeLevel("all")}
              >
                <span class="v-mid di">All</span>
            </button>
          </div>
          <div class="w-100 w-20-ns v-bottom tr mh1">
            <button
              class={ `dark-gray dib bg-white bg-animate hover-bg-light-gray w-50 pv2 outline-0 b--grey ba br2 br--right mv1 pointer` }
              title="Refresh"
              type="button"
              onclick={refreshLogs}
              >
                <span class="v-mid di">Refresh</span>
            </button>
          </div>
        </div>
        {loading && <BarLoader />}
        <Fragment>
          {fetchError && <Error msg={fetchError} />}
          {fetchLogs.length > 0 ? (
            <table id="logs-table" class="mt2 w-100 center" cellSpacing="0" style="border-collapse: separate;">
              <thead>
                <tr>
                  {["Timestamp", "Object", "Message", "Details"].map(el => (
                    <th class="fw6 bb b--black-30 tl pv3 pr3 bg-white sticky z-99">
                      {el}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody class="lh-copy tl" id="boxes-table">
                { fetchLogs.map((el, idx) => (
                  <tr class={`w-100 ${idx %2 ? "bg-transparent" : "bg-near-white"} `}>
                    <td class="w-20 v-top" style="max-width: 100px">
                      { dateString(el) }
                    </td>
                    <td class="w-10 v-top" style="max-width: 50px">
                      { getMetaObject(el) }
                    </td>
                    <td class="w-20 v-top" style="max-width: 100px">
                      { el.message }
                    </td>
                    <td class="w-50 v-top" style="max-width: 600px">
                      { formatMeta(el) }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div class="ma5">None</div>
          )}
        </Fragment>
      </div>
    );
  }
}

export default CurrentLogs;
