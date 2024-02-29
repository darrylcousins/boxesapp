/**
 * The date select component used by container-box
 *
 * @module app/components/container/dateSelector
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { selectDateEvent } from "./events";
import { getSetting } from "../../helpers";

/**
 * Date selector component
 *
 * @yields {Element} DOM component
 */
function* DateSelector({fetchDates, selectedDate, variantTitle}) {

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
      const date = ev.target.getAttribute("data-item");
      this.dispatchEvent(selectDateEvent(date));
      this.refresh();
      return;
    };
    return;
    if (ev.target.tagName === "BUTTON") {
      switch(ev.target.id) {
        case selectorId:
          selectDateOpen = !selectDateOpen;
          this.refresh();
          break;
      }
    } else if (ev.target.tagName === "DIV") {
      switch(ev.target.getAttribute("name")) {
        case selectorId:
          const date = ev.target.getAttribute("data-item");
          this.dispatchEvent(selectDateEvent(date));
          selectDateOpen = false;
          this.refresh();
          break;
      }
    }
  };
  this.addEventListener("mouseup", handleMouseUp);

  for ({fetchDates, selectedDate} of this) {
    yield (
      <div id="dateSelector">
        { (fetchDates.length > 0) ? (
          <Fragment>
            { !selectedDate &&  (
              <div class="boxesapp-notice">
                <p data-setting="notice-choose-date">{getSetting("Translation", "notice-choose-date")}</p>
              </div>
            )}
            <div class="relative">
              { (fetchDates.length > 1) ? (
                <Fragment>
                  <div class="relative boxesapp-choice-wrapper">
                    {getDates().map(el => ({text: el, item: el})).map((el, idx, arr) => (
                      <button 
                        data-item={el.item}
                        data-title={el.text}
                        class={ `boxesapp-choice${selectedDate === el.text ? " boxesapp-choice-selected" : ""}` }>
                        { el.text }
                      </button>
                    ))}
                  </div>
                </Fragment>
              ) : (
                <div class="boxesapp-wrapper">
                  <div id="delivery-date">
                    <span>Next delivery: </span>
                    <span style="float: right">{ selectedDate }</span>
                  </div>
                </div>
              )}
            </div>
          </Fragment>
        ) : (
          <div class="boxesapp-notice">
            <p data-setting="notice-no-boxes">{getSetting("Translation", "notice-no-boxes")}</p>
          </div>
        )}
      </div>
    )
  }
};

export default DateSelector;
