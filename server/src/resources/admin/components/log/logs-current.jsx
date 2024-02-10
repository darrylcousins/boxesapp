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
import { titleCase, animateFadeForAction } from "../helpers";
import IconButton from "../lib/icon-button";
import { SearchIcon, ClearSearchIcon, SyncIcon } from "../lib/icon";

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
   * Possible selections to make on object type
   *
   * @member possibleObjects
   * @type {array}
   */
  let possibleObjects = ["order", "recharge", "shopify", "mail", "all"];
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
    } else {
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
      uri = `${uri}/${searchTerm}`;
    };
    console.log(uri);
    Fetch(uri)
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
    logLevel = "all";
    await refreshLogs();
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
      selectedObject = "recharge"; // at this stage only searching on recharge messages??
      logLevel = "notice";
      console.log(searchTerm);
      return await refreshLogs();
    };
    await this.refresh();
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

  /**
   * Help/info for the logs
   *
   * @member Help
   * @type {object}
   */
  const Help = ({id}) => {
    const showHelp = (e) => {
      document.querySelector(`#${id}`).style.display = "block";
      window.addEventListener('click', (e) => {
        document.querySelector(`#${id}`).style.display = "none";
      });
    };
    const hideHelp = (e) => {
      document.querySelector(`#${id}`).style.display = "none";
    };
    return (
      <div style="font-weight: 700;">
        <div class="dib pa2 pointer tr" style="display: inline"
          onmouseover={ showHelp }
          onmouseout={ hideHelp }
        >&#63;</div></div>
    );
  };

  /*
   * Helper method for tidy date strings from timestamp
   */
  const dateString = (el) => {
    const date = new Date(el.timestamp);
    return `${date.toDateString()} ${date.toLocaleTimeString()}`;
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
   * Helper method to render comma separated list
   */
  const formatList = (str) => {
    if (str === null) return "None";
    if (str.length === 0) return "None";
    return (
      str.split(",").map(el => <div>{ el }</div>)
    );
  };

  /*
   * Helper method to render objects
   */
  const formatObj = (obj, title) => {
    if (obj === null) return <div>{ title }: null</div>;

    const final = [];
    let classes;
    // assumes an object
    for (const [key, value] of Object.entries(obj)) {
      classes = [];
      if (Number.isInteger(parseInt(key))) { // arrays
        if (typeof value === "object") { // array of objects
          final.push(formatObj(value, key));
          classes.push("bb b--black-20");
        } else {
          final.push(value);
        };
      } else if (typeof value === "object") {
        final.push(formatObj(value, key));
        classes.push("bb b--black-20");
      } else {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          final.push(`${key}: ${value}`);
        } else if (value === null) {
          final.push(`${key}: null`);
        } else {
          final.push(formatObj(value, key));
        };
      };
    };
    if (title) {
      if (Number.isInteger(parseInt(title))) { // arrays
        return (
          final.map(el => <div class={ classes.join(" ") }>{ el }</div>)
        );
      } else {
        return (
          <div class="dt-row w-100">
            <div class="dtc gray tr pr2">
              { title }:
            </div>
            <div class="dtc">
              { final.map(el => <div class={ classes.join(" ") }>{ el }</div>) }
            </div>
          </div>
        );
      };
    } else {
      return (
        final.map(el => <div class={ classes.join(" ") }>{ el }</div>)
      );
    };
  };

  /*
   * Helper method to render everything
   */
  const formatOther = (obj, title) => {

    // Special case, not sure how else to figure this one out
    const attributes = ["Including", "Add on Items", "Removed Items", "Swapped Items"];
    if (attributes.includes(title)) {
      return formatList(obj);
    };

    // attempt parse any json strings
    try {
      obj = JSON.parse(obj);
    } catch(e) {
      obj = obj;
    };

    if (JSON.stringify(obj, null, 2) === "null") {
      return "null";
    };

    if (typeof obj !== "object") {
      return `${obj}`;
    };

    // now want to format the json
    try {
      return formatObj(obj);
    } catch(e) {
      console.warn(e);
      console.warn(title);
      console.warn(obj);
      return JSON.stringify(obj);
    };
  };

  /*
   * Helper method to render log.meta
   */
  const formatMeta = (el) => {
    if (!Object.hasOwnProperty.call(el, 'meta')) {
      return <div>&nbsp;</div>;
    };
    if (el.meta === null) {
      return <div>&nbsp;</div>;
    };
    // expecting just one object on meta 'order', 'product', 'customer', 'subscription'?
    const obj = Object.keys(el.meta)[0];
    if (possibleObjects.includes(obj) && el.meta[obj]) {
      return (
        <div class="dt w-100 mv1">
          { Object.entries(el.meta[obj]).map(([title, str]) => (
              <div class="dt-row w-100">
                <div class="dtc w-20 gray tr pr2">
                  { title }:
                </div>
                <div class="dtc w-80" style="width: 400px; word-wrap: break-word;">
                  { formatOther(str, title) }
                </div>
              </div>
          ))}
        </div>
      );
    } else {
      return (
        <div class="dt w-100 mv1">
          { Object.entries(el.meta).map(([title, str]) => (
              <div class="dt-row w-100">
                <div class="dtc w-30 gray tr pr2">
                  { title }:
                </div>
                <div class="dtc w-70">
                  { str }
                </div>
              </div>
          ))}
        </div>
      );
    };
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

  for (const _ of this) { // eslint-disable-line no-unused-vars

    yield (
      <div class="w-100 pb2">
        <h4 class="pt0 lh-title ma0 mb2 fg-streamside-maroon" id="boxes-title">
          { logLevel && formatLevel(logLevel) } Logs {" "}
          { pageSize && fetchCount > pageSize && <span>{ pageSize } of</span> } {" "}
          { fetchCount && <span>{ fetchCount }</span> }
        </h4>
        {fetchLogs.length > 0 && (
          <Pagination callback={ movePage } pageCount={ parseInt(pageCount) } pageNumber={ parseInt(pageNumber) } />
        )}
        <div class="relative w-100 tr pr2">
          <Help id="logsInfo" />
          <p id="logsInfo" class="info tr" role="alert">
            Only logs more recent than two days ago are available here.
          </p>
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
                  placeholder={`customer or subscription id`}
                  name="searchTerm" />
              </div>
              <div class="w-30 flex" style="height: 1.8em">
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
          <div class="w-20 v-bottom tr">
              <SelectMenu
                id="selectObject"
                menu={possibleObjects.map(el => ({text: el, item: el}))}
                title="Filter by Object"
                active={menuSelectObject}
                style={{border: 0}}
              >
                { selectedObject ? `${selectedObject} messages` : "Filter by" }&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#9662;
              </SelectMenu>
          </div>
          <div class="w-50 v-bottom tr">
            <button
              class={
                `${
                    logLevel === "notice" ? "white bg-black-80" : "grey bg-white bg-animate hover-bg-light-gray"
                  } dib w-25 pv1 outline-0 b--grey ba br2 br--left mv1 pointer`
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
                  } dib w-25 pv1 outline-0 b--grey bt bb br bl-0 br2 br--right br--left mv1 pointer`
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
                  } dib w-25 pv1 outline-0 b--grey bt bb br bl-0 br2 br--right br--left mv1 pointer`
                }
              title="Fatal"
              type="button"
              onclick={() => changeLevel("all")}
              >
                <span class="v-mid di">All</span>
            </button>
          </div>
          <div class="w-20 v-bottom tr mh1">
            <button
              class={ `dark-gray dib bg-white bg-animate hover-bg-light-gray w-50  pv1 outline-0 b--grey ba br2 br--right mv1 pointer` }
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
                    <td class="w-50 v-top" style="max-width: 500px">
                      { formatMeta(el) }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div>None</div>
          )}
        </Fragment>
      </div>
    );
  }
}

export default CurrentLogs;
