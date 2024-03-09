/**
 * Top of hierarchy of elements to render boxes
 *
 * @module app/components/boxes-current
 * @exports CurrentBoxes
 * @requires module:app/components/boxes~Boxes
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import AddBoxModal from "./box-add";
import DuplicateBoxModal from "./boxes-duplicate";
import RemoveBoxesModal from "./boxes-remove";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import { PostFetch, Fetch } from "../lib/fetch";
import IconButton from "../lib/icon-button";
import SelectMenu from "../lib/select-menu";
import Boxes from "./boxes";
import BoxSettings from "./box-settings";
import PushMenu from "../lib/push-menu";
import { animateFadeForAction, dateStringSort } from "../helpers";
import Help from "../lib/help";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import {
  ToggleOnIcon,
  ToggleOffIcon,
} from "../lib/icon";

/**
 * Uses fetch to collect current boxes from api and then passes data to
 * {@link module:app/boxes} to display as a table.
 * 
 * **timestamp** allows preload of particular date - see initialize
 *
 * @generator
 * @yields {Element}
 */
function* CurrentBoxes({ timestamp }) {

  /**
   * Contains box data as collected from [api/current-boxes]{@link
   * module:api/current-boxes}. The data uses delivery date as keys to unsorted
   * array of box data.
   *
   * @returns {Element} Dom component
   * @member fetchJson
   * @type {object.<string, Array>}
   */
  let fetchJson = {};
  /**
   * Display loading indicator while fetching data
   *
   * @member loading
   * @type {boolean}
   */
  let loading = true;
  /**
   * Boxes fetched from api for the selectedDate
   *
   * @member {object} fetchBoxes
   */
  let fetchBoxes = [];
  /**
   * Settings fetched from api
   *
   * @member {object} fetchSettings
   */
  let fetchSettings = [];
  /**
   * Delivery dates - the array of dates from fetchDates
   *
   * @member {object} fetchDates
   */
  let fetchDates = [];
  /**
   * If fetching data was unsuccessful.
   *
   * @member fetchError
   * @type {object|string|null}
   */
  let fetchError = null;
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
   * Fetch boxes data on mounting of component use the closest next date or on
   * change of selectedDate
   *
   * @function getBoxes
   */
  const getBoxes = () => {
    let uri = `/api/current-boxes-by-date/${new Date(selectedDate).getTime()}`;
    Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          loading = false;
          fetchBoxes = json.boxes;
          fetchSettings = json.settings;
          if (document.getElementById("boxes-table")) {
            animateFadeForAction("boxes-table", async () => await this.refresh());
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

  const getMostCurrentDate = (dates) => {
    const currentDates = [];
    for (const date of dates) {
      const parsedDate = Date.parse(date);
      if (parsedDate) {
        if (parsedDate >= Date.now()) {
          currentDates.push(date);
        };
      };
    };
    return currentDates[0];
  };

  /**
   * Fetch available dates
   *
   * @function getDates
   */
  const getDates = () => {
    const uri = `/api/current-box-dates`;
    Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          const dates = json.dates.filter(el => el.toUpperCase() !== "INVALID DATE");
          // setting selectedDate after duplicating boxes
          console.log(selectedDate);
          if (!selectedDate) {
            if (timestamp) selectedDate = new Date(parseInt(timestamp)).toDateString();
            if (!selectedDate) {
              if (dates.length) selectedDate = getMostCurrentDate(dates);
            } else {
              if (!dates.includes(selectedDate)) selectedDate = getMostCurrentDate(dates);
            };
          };
          fetchDates = json.fetchDates;
          getBoxes();
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  /**
   * Event handler when {@link
   * module:form/form-modal~FormModalWrapper|FormModalWrapper} saves the data
   *
   * @function reloadBoxes
   * @param {object} ev The event
   * @listens listing.reload
   */
  const reloadBoxes = (ev) => {
    if (ev) {
      try {
        console.log(ev.detail);
        console.log("selectedDate", selectedDate)
        if (Object.hasOwn(ev.detail, "src")) {
          console.log("src", ev.detail.src);
          if (ev.detail.src === "/api/duplicate-boxes") {
            selectedDate = ev.detail.json.delivered;
            console.log(ev.detail.json.delivered);
          } else if (ev.detail.src === "/api/remove-boxes") {
            console.log(fetchDates);
            selectedDate = fetchDates.at(-2).delivered;
          };
        };
        console.log("selectedDate", selectedDate)
      } catch(err) {
        console.log(err);
      };
    };
    getDates();
  };

  this.addEventListener("listing.reload", reloadBoxes);

  /**
   * For messaging user
   */
  this.addEventListener("toastEvent", Toaster);

  /*
   * Submit form to toggle boxes on/off active
   * @function toggleBox
   */
  const toggleBoxes = async (data) => {
    const headers = { "Content-Type": "application/json" };
    const { error, json } = await PostFetch({
      src: "/api/toggle-box-active",
      data,
      headers,
    })
      .then((result) => result)
      .catch((e) => ({
        error: e,
        json: null,
      }));
    if (!error) {
      const notice = `Toggled all boxes ${data.active ? "on" : "off"}`;
      this.dispatchEvent(toastEvent({
        notice,
        bgColour: "black",
        borderColour: "black"
      }));
      reloadBoxes();
    }
    // need to provide user feedback of success or failure
    return { error, json };
  };

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
   * Handle click events
   *
   * @function clickEvent
   * @param {object} ev Click event
   * @listens window.click
   */
  const clickEvent = async (ev) => {
    let target = ev.target;
    if (["PATH", "SVG"].includes(target.tagName.toUpperCase())) {
      target = target.closest("button");
      if (!target) return;
    };
    const name = target.tagName.toUpperCase();
    if (name === "BUTTON") {

      switch(target.id) {
        case "selectDate":
          // open and close date select dropdown
          menuSelectDate = !menuSelectDate;
          this.refresh();
          break;
        default:
          if (menuSelectDate) {
            // close menu on all clicks not captured
            closeMenu();
          };
      };
      let data;
      switch(target.getAttribute("name")) {
        case "toggle-on":
          data = {
            delivered: selectedDate,
            active: true,
          };
          await toggleBoxes(data);
          break;
        case "toggle-off":
          data = {
            delivered: selectedDate,
            active: false,
          };
          await toggleBoxes(data);
          break;
      };
    } else if (target.getAttribute("name") === "selectDate") {

      // set selected date from date select dropdown component
      const date = target.getAttribute("data-item");
      menuSelectDate = false;
      if (date !== selectedDate) {
        selectedDate = date;
      } else {
        this.refresh();
      };
      getBoxes();

    } else {
      if (menuSelectDate) {
        // close menu on all clicks not captured
        closeMenu();
      };
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
   * @function keyEvent
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

  // collects dates and boxes and set side navigation menu
  getDates();

  const proxy_path = localStorage.getItem("proxy-path");
  const qs = localStorage.getItem("qs"); // query string to maintain access
  const boxRulesPath = `${proxy_path}/admin-portal/boxes/box-rules${ qs }`;
  const coreBoxPath = `${proxy_path}/admin-portal/boxes/core-box${ qs }`;

  /*
   * Helper for the SelectMenu
   */
  const Item = ({text, item}) => {
    // cannot seem to get the event to bubble
    return (
      <div class="flex justify-between pr3" name="selectDate" data-item={ item }>
        <div name="selectDate" data-item={ item }>{text.delivered}</div>
        <div name="selectDate" data-item={ item } class="tr">{text.count}</div>
        <div name="selectDate" data-item={ item } class={text.active ? "green" : "red"}>&#9679;</div>
      </div>
    );
  };

  /**
   * Side navigation menu
   *
   * @member sideMenu
   * @type {array}
   */
  const sideMenu = [
    <div onclick={() => window.location = coreBoxPath}>
      <IconButton
         name="Edit Core Box"
         title="Edit Core Box">
        <span style="width: 250px" class="db tl link white pv1 pl3 pr2">Edit core box</span>
      </IconButton>
    </div>,
    <div onclick={() => window.location = boxRulesPath}>
      <IconButton
         name="Box Rules"
         title="Box Rules">
        <span style="width: 250px" class="db tl link white pv1 pl3 pr2">Box rules</span>
      </IconButton>
    </div>
  ];

  for (const _ of this) { // eslint-disable-line no-unused-vars

    const active = fetchBoxes.find(el => el.active === true);
    const inactive = fetchBoxes.find(el => el.active === false);

    yield (
      <div class="w-100 pb2">
        {loading && <BarLoader />}
        <PushMenu children={sideMenu} />
        <div class="pl5" style="margin-top: -35px">
          <h4 class="pt0 lh-title ma0 fg-streamside-maroon" id="boxes-title">
            Current Boxes {selectedDate ? `for ${selectedDate}` : ""}
          </h4>
        </div>
        <div class="relative w-100 tr pr2">
          <Help id="ordersInfo" />
          <p id="ordersInfo" class="alert-box info info-right w-95" role="alert">
            Boxes are removed two weeks after delivery date. A back up file will be available for a short time thereafter.
          </p>
        </div>
        <div class="overflow-visible">
          {fetchError && <Error msg={fetchError} />}
          <div class="w-100 flex fg-streamside-maroon">
            { !loading && (
              <div class="tr v-mid w-30 fl">
                <SelectMenu
                  id="selectDate"
                  menu={fetchDates.map(el => ({text: <Item text={el} item={ el.delivered } />, item: el.delivered, title: el.delivered}))}
                  title="Select Delivery Date"
                  active={menuSelectDate}
                  style={{border: 0, color: "brown", "font-size": "1.2em"}}
                >
                  { selectedDate ? selectedDate : "Select delivery date" }&nbsp;&nbsp;&nbsp;&#9662;
                </SelectMenu>
              </div>
            )}
            {selectedDate && !loading ? (
              <Fragment>
                <div class="w-70 fl tr v-mid">
                  { ( new Date(selectedDate) >= new Date() )  && (
                    <Fragment>
                      {active && (
                        <IconButton color="dark-green" title="Toggle all boxes off" name="toggle-off">
                          <ToggleOnIcon />
                        </IconButton>
                      )}
                      {inactive && (
                        <IconButton color="dark-red" title="Toggle all boxes on" name="toggle-on">
                          <ToggleOffIcon />
                        </IconButton>
                      )}
                    </Fragment>
                  )}
                  <DuplicateBoxModal currentDate={selectedDate} />
                  { ( new Date(selectedDate) >= new Date() )  && (
                    <Fragment>
                      <AddBoxModal delivered={selectedDate} />
                      <RemoveBoxesModal delivered={selectedDate} />
                    </Fragment>
                  )}
                  <BoxSettings delivered={selectedDate} settings={fetchSettings} />
                </div>
              </Fragment>
            ) : (
              <div class="w-100 w-two-thirds-l fl-l tr v-mid">
                <AddBoxModal delivered={null} />
              </div>
            )}
          </div>
          {fetchBoxes.length > 0 && (
            <Boxes boxes={fetchBoxes} />
          )}
        </div>
      </div>
    );
  }
}

export default CurrentBoxes;
