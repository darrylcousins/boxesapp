/**
 * Top of hierarchy of elements to render boxes
 *
 * @module app/components/boxes-current
 * @exports CurrentBoxes
 * @requires module:app/components/boxes~Boxes
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import { Fetch } from "../lib/fetch";
import SelectMenu from "../lib/select-menu";
import { animateFadeForAction } from "../helpers";

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
   * Which log level to view
   *
   * @member level
   * @type {string}
   */
  let logLevel = "notice";
  /**
   * Select menu to filter on meta[object]
   *
   * @member level
   * @type {Boolean}
   */
  let menuSelectObject = false;
  /**
   * Selected object to filter on 'order', 'product' etc
   *
   * @member level
   * @type {string}
   */
  let selectedObject = null;
  /**
   * Possible selections to make on object type
   *
   * @member level
   * @type {array}
   */
  let possibleObjects = ["order", "product", "recharge", "app", "shopify"];
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

  /**
   * Fetch log data on mounting of component
   *
   * @function getLogs
   */
  const getLogs = () => {
    let uri;
    if (logLevel) {
      uri = `/api/current-logs/${logLevel}`;
    } else {
      uri = `/api/current-logs/all`;
    };
    if (selectedObject) {
      uri = `${uri}/${selectedObject}`;
    }
    Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          loading = false;
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
   * Helper method to render log.meta
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
    console.log("obj", obj);
    console.log(possibleObjects);
    console.log(el.meta);
    if (possibleObjects.includes(obj)) {
      return (
        <div class="dt w-100 mv1">
          { Object.entries(el.meta[obj]).map(([title, str]) => (
              <div class="dt-row w-100">
                <div class="dtc w-50 gray tr pr2">
                  { title }:
                </div>
                <div class="dtc w-50">
                  { str }
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
                <div class="dtc w-20 gray tr pr2">
                  { title }:
                </div>
                <div class="dtc w-50">
                  { str }
                </div>
              </div>
          ))}
        </div>
      );
    };
  };

  /*
                <div class="dtc w-70">
                  { title === "properties" && (
                    str.map(item => (
                      <div class="dt-row w-100">
                        <div class="dtc w-50 gray tr pr2">
                          { item.name }:
                        </div>
                        <div class="dtc w-50">
                          { item.value }
                        </div>
                      </div>
                    ))
                  )}
                  { title === "stack" && (
                    str.split("\n").map(el => (
                      <div>{ el }</div>
                    ))
                  )}
                  { title !== "stack" && title !== "properties" (
                    str
                  )}
                </div>
                */
  for (const _ of this) { // eslint-disable-line no-unused-vars

    yield (
      <div class="w-100 pb2 center">
        <h4 class="pt0 lh-title ma0 fg-streamside-maroon" id="boxes-title">
          Current Logs
        </h4>
        <div class="relative w-100 tr pr2">
          <Help id="logsInfo" />
          <p id="logsInfo" class="info tr" role="alert">
            Only logs more recent than two days ago are available here.
          </p>
        </div>
        <div class="w-100 flex">
          <div class="w-20 v-bottom center">
            { logLevel === "notice" ? (
              <SelectMenu
                id="selectObject"
                menu={possibleObjects.map(el => ({text: el.toUpperCase(), item: el}))}
                title="Filter by Object"
                active={menuSelectObject}
                style={{border: 0, color: "brown"}}
              >
                { selectedObject ? `${selectedObject} messages`.toUpperCase() : "FILTER BY" }&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#9662;
              </SelectMenu>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
          <div class="w-30">
            &nbsp;
          </div>
          <div class="w-50 v-bottom tr">
            <button
              class={
                `${
                    logLevel === "notice" ? "white bg-black-80" : "grey bg-white"
                  } dib w-third pv1 outline-0 b--grey ba br2 br--left mv1 pointer`
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
                    logLevel === "error" ? "white bg-black-80" : "grey bg-white"
                  } dib w-third pv1 outline-0 b--grey bt bb br bl-0 br2 br--right br--left mv1 pointer`
                }
              title="Errors"
              type="button"
              onclick={() => changeLevel("error")}
              >
                <span class="v-mid di">Errors</span>
            </button>
          </div>
        </div>
        {loading && <BarLoader />}
        <Fragment>
          {fetchError && <Error msg={fetchError} />}
          <div id="logs-table" class="mt2">
            {fetchLogs.length > 0 ? (
              <Fragment>
                <div class="dt w-100 bb pv2">
                  <div class="dtc w-20 bold">
                    Timestamp
                  </div>
                  <div class="dtc w-10 tl bold">
                    Object
                  </div>
                  <div class={`dtc ${logLevel === "notice" ? "w-30" : "w-20"} bold`}>
                    Message
                  </div>
                  <div class={`dtc ${logLevel === "notice" ? "w-40" : "w-50"} bold`}>
                    Details
                  </div>
                </div>
                { fetchLogs.map((el, idx) => (
                  <div class={`dt w-100 bb ${idx %2 ? "bg-transparent" : "bg-near-white"} `}>
                    <div class="dtc w-20">
                      { dateString(el) }
                    </div>
                    <div class="dtc w-10 tl">
                      { getMetaObject(el) }
                    </div>
                    <div class={`dtc ${logLevel === "notice" ? "w-30" : "w-20"}`}>
                      { el.message }
                    </div>
                    <div class={`dtc ${logLevel === "notice" ? "w-40" : "w-50"}`}>
                      { formatMeta(el) }
                    </div>
                  </div>
                ))}
              </Fragment>
            ) : (
              <div>None</div>
            )}
          </div>
        </Fragment>
      </div>
    );
  }
}

export default CurrentLogs;
