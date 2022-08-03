/**
 * The date select component used by container-box
 *
 * @module app/components/container/dateSelector
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { selectDateEvent, selectorOpenEvent } from "../events";
import SelectMenu from "../select-menu";
import { getSetting } from "../../helpers";

/**
 * Date selector component
 *
 * @yields {Element} DOM component
 */
function* DateSelector({fetchDates, selectedDate}) {

  /**
   * Display date selection menu if active
   *
   * @member selectDateOpen
   * @type {boolean}
   */
  let selectDateOpen = false;
  /**
   * Selector id for select menu
   *
   * @member selectorId
   * @type {string}
   */
  const selectorId = "selectDate";

  /**
   * Sort the date array
   *
   * @function getDates
   */
  const getDates = () => {
    const sortedDateObjects = fetchDates
      .map(el => new Date(el))
      .sort((d1, d2) => {
        if (d1 < d2) return -1;
        if (d1 > d2) return 1;
        return 0;
      });
    return sortedDateObjects.map(d => d.toDateString());
  };

  /**
   * Handle mouse up on selected components
   *
   * @function handleMouseUp
   * @param {object} ev The firing event
   * @listens click
   */
  const handleMouseUp = (ev) => {
    if (ev.target.tagName === "BUTTON") {
      switch(ev.target.id) {
        case selectorId:
          this.dispatchEvent(selectorOpenEvent(selectorId));
          break;
      }
    } else if (ev.target.tagName === "DIV") {
      switch(ev.target.getAttribute("name")) {
        case selectorId:
          const date = ev.target.getAttribute("data-item");
          this.dispatchEvent(selectorOpenEvent(null));
          this.dispatchEvent(selectDateEvent(date));
          break;
      }
    }
  };
  this.addEventListener("mouseup", handleMouseUp);
  /**
   * Handle selector open event, if matching selectorId the menu is open, else close
   *
   * @function handleSelectorOpen
   * @param {object} ev The firing event
   * @listens selectorOpenEvent
   */
  const handleSelectorOpen = (ev) => {
    if (selectorId === ev.detail.selector) {
      selectDateOpen = !selectDateOpen;
    } else {
      selectDateOpen = false;
    }
    this.refresh();
  };
  this.addEventListener("selectorOpenEvent", handleSelectorOpen)

  const wrapperStyle = {
    border: "1px solid #ccc",
    "margin-bottom": "3px"
  };

  for ({fetchDates, selectedDate} of this) {
    yield (
      <div id="dateSelector">
        { (fetchDates.length > 0) ? (
          <Fragment>
            { !selectedDate &&  (
              <div class="notice"
                    style={{
                      "background-color": getSetting("Colour", "notice-bg")
                    }}>
                <p>{getSetting("Translation", "notice-choose-date")}</p>
              </div>
            )}
            <div class="relative">
              { (fetchDates.length > 1) ? (
                <SelectMenu
                  id={selectorId}
                  menu={getDates().map(el => ({text: el, item: el}))}
                  title="Select Date"
                  active={selectDateOpen}
                >
                  { selectedDate 
                      ? selectedDate 
                      : getSetting("Translation", "select-delivery-date") }&nbsp;&nbsp;&nbsp;{ selectDateOpen ? "▴" : "▾" }
                </SelectMenu>
              ) : (
                <div style={ wrapperStyle }>
                  <div class="ma1">
                    <span class="b">Next delivery: </span>
                    <span class="b fr fg-streamside-blue">{ selectedDate }</span>
                  </div>
                </div>
              )}
            </div>
          </Fragment>
        ) : (
          <div class="notice"
                style={{
                  "background-color": getSetting("Colour", "notice-bg")
                }}>
            <p>{getSetting("Translation", "notice-no-boxes")}</p>
          </div>
        )}
      </div>
    )
  }
};

export default DateSelector;