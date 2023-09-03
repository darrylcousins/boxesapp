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
  let possibleObjects = ["order", "product", "recharge", "shopify", "mail"];
  /**
   * Display loading indicator while fetching data
   *
   * @member loading
   * @type {boolean}
   */
  let loading = true;
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
        // do something
        selectedObject = item;
        loading = true;
        await this.refresh();
        getLogs();
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
    return await getLogs();
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
    loading = true;
    await this.refresh();
    getLogs();
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
                <div class="dtc w-80">
                  { (typeof str === "string") ? `${ str }` : `${JSON.stringify(str)}` }
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
          { logLevel && formatLevel(logLevel) } Logs
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
        <div class="w-100 flex">
          { true && (
            <div class="w-20 v-bottom">
                <SelectMenu
                  id="selectObject"
                  menu={possibleObjects.map(el => ({text: el.toUpperCase(), item: el}))}
                  title="Filter by Object"
                  active={menuSelectObject}
                  style={{border: 0, color: "brown"}}
                >
                  { selectedObject ? `${selectedObject} messages`.toUpperCase() : "FILTER BY" }&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#9662;
                </SelectMenu>
            </div>
          )}
          <div class="w-60 v-bottom tr">
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
          <div class="w-20 v-bottom tl mh1">
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
                    <td class="w-20 v-top">
                      { dateString(el) }
                    </td>
                    <td class="w-10 v-top">
                      { getMetaObject(el) }
                    </td>
                    <td class="w-20 v-top">
                      { el.message }
                    </td>
                    <td class="w-50 v-top">
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
