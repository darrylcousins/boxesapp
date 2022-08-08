/**
 * Creates element to render a modal display in {@link
 *
 * @module app/components/box-settings
 * @exports OrderModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import { CloseIcon, SettingsIcon } from "../lib/icon";
import { PostFetch } from "../lib/fetch";
import { animateFadeForAction, weekdays } from "../helpers";
import { toastEvent } from "../lib/events";
import IconButton from "../lib/icon-button";
import Button from "../lib/button";
import ModalTemplate from "../lib/modal-template";

/**
 * Display a modal containing box settings
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {object} props.order The order to be displayed
 */
async function* BoxSettings({ delivered, settings }) {
  /**
   * Hold visibility state.
   *
   * @member {boolean} visible
   */
  let visible = false;
  /**
   * Settings
   *
   * @member currentSettings
   * @type {boolean}
   */
  let currentSettings = null;
  /**
   * Settings have been edited, show save button
   *
   * @member showSaveSettings
   * @type {boolean}
   */
  let showSaveSettings = false;
  /**
   * Select date as day of week
   *
   * @member {boolean} selectedDateDay
   */
  let selectedDateDay = null;

  /**
   * Open the modal
   *
   * @function openModal
   */
  const openModal = () => {
    visible = true;
    currentSettings = settings;
    selectedDateDay = weekdays[new Date(Date.parse(delivered)).getDay()];
    this.refresh();
  };

  /**
   * Action which opens the modal and refreshes component, checks target for
   * closest button to ensure that event is this.event. Fired on `this.click`.
   * Can be overridden using ShowLink if, say, a button element not used.
   *
   * @function showModalAction
   * @param {event} ev A click event on this element
   * @listens window.click
   */
  const showModalAction = async (ev) => {
    // are we on the right target??
    if (ev.target.closest(`button[name='box-settings']`)) {
      openModal();
    };
  };

  this.addEventListener("click", showModalAction);

  /**
   * Close the modal
   *
   * @function closeModal
   */
  const closeModal = () => {
    visible = false;
    currentSettings = settings;
    showSaveSettings = false;
    this.refresh();
  };

  /**
   * Hide the modal
   *
   * @function hideModal
   * @param {object} ev Event emitted
   * @listens window.click
   * @listens window.keyup
   */
  const hideModal = async (ev) => {
    if (ev.target && ev.target.tagName === "BUTTON") {
      visible = !visible;
      this.refresh();
    };
    if (ev.key && ev.key === "Escape") {
      closeModal();
    };
  };

  this.addEventListener("click", hideModal);

  this.addEventListener("keyup", hideModal);

  /**
   * Watch input on settings
   *
   * @member watchSettingsInput
   * @type {function}
   */
  const watchSettingsInput = (ev) => {
    const {id, value} = ev.target;
    currentSettings[id] = value;

    if (!showSaveSettings) {
      showSaveSettings = true;
      animateFadeForAction("settings", async () => await this.refresh());
    } else {
      this.refresh();
    };
  };

  /**
   * Save changed settings
   *
   * @member saveSettings
   * @type {function}
   */
  const saveSettings = async () => {
    // handle, weekday, value
    const data = [];
    for (const id of ['cutoff', 'limit']) {
      data.push({
        handle: `box-${id}`,
        weekday: selectedDateDay,
        value: document.querySelector(`#${id}`).value,
      });
    };
    const headers = { "Content-Type": "application/json" };
    const { error, json } = await PostFetch({
      src: "/api/edit-box-setting",
      data,
      headers,
    })
      .then((result) => result)
      .catch((e) => ({
        error: e,
        json: null,
      }));
    if (!error) {
      closeModal();
      this.dispatchEvent(
        new CustomEvent("listing.reload", {
          bubbles: true,
        })
      );
      const notice = `Saved changed settings for ${selectedDateDay} boxes.`;
      this.dispatchEvent(toastEvent({
        notice,
        bgColour: "black",
        borderColour: "black"
      }));
    };
  };

  const main = document.getElementById("modal-window");

  for await ({ delivered, settings } of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <IconButton color={"navy"} title={"Settings"} name={"box-settings"}>
          <SettingsIcon />
        </IconButton>
        {visible && (
          <Portal root={main}>
            <ModalTemplate closeModal={ closeModal } loading={ false } error={ false } withClose={ false }>
              <div class="tc center">
                <h6 class="fw4 tl fg-streamside-maroon">Box settings for { selectedDateDay }</h6>
              </div>
              <div class="navy mv2 pt2 pl2 br3 ba b--navy bg-washed-blue">
                <ul class="pr2">
                  <li>
                    Settings for {selectedDateDay} delivery.
                    These settings apply to all boxes delivered on a {selectedDateDay}.
                  </li>
                  <li class="mt1">
                    The &ldquo;order limit&rdquo; limits the orders allowed (zero means no limit on orders).
                  </li>
                  <li class="mt1">
                    The &ldquo;cut off hours&rdquo; are the number of hours before 00:00am on day of delivery that the box can be ordered.
                  </li>
                </ul>
              </div>

              <div id="settings">
                <div class="w-100">
                  <div class="tl ph2 mt1 ml0">
                    <label class="lh-copy w-30" htmlFor="limit" for="limit" style="font-size: 1em">
                      Order limit
                    </label>
                    <input 
                      id="limit"
                      type="number" 
                      step="1"
                      min="0"
                      oninput={watchSettingsInput}
                      value={ currentSettings.limit}
                      class="input-reset ba b--black-10 br3"
                      style="width: 4.5em; border-color: silver; padding: 0 3px; margin: 0"
                      />
                  </div>
                  <div class="tl ph2 mt1 ml0">
                    <label class="lh-copy w-30" htmlFor="limit" for="limit" style="font-size: 1em">
                      Cut off hours
                    </label>
                    <input 
                      id="cutoff"
                      type="number" 
                      step="0.5"
                      min="0"
                      oninput={watchSettingsInput}
                      value={ currentSettings.cutoff }
                      class="input-reset ba b--black-10 br3"
                      style="width: 4.5em; border-color: silver; padding: 0 3px; margin: 0"
                      />
                  </div>
                </div>
                <div class="mh2 mt1 w-100 tr">
                  { showSaveSettings && (
                    <Fragment>
                      <Button type="primary" onclick={saveSettings}>
                        Save Settings
                      </Button>
                      <Button type="secondary" onclick={closeModal}>
                        Cancel
                      </Button>
                    </Fragment>
                  )}
                </div>
              </div>
            </ModalTemplate>
          </Portal>
        )}
      </Fragment>
    );
  };
}

export default BoxSettings;
