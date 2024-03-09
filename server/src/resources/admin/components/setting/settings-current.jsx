/**
 * Starting point of url route /settings
 * Provides interface for general user to edit settings
 * i.e. cannot add settings, only editable settings are included
 *
 * @module app/route/settings
 * @exports Settings
 * @requires module:app/settings
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { animateFadeForAction, hasOwnProp } from "../helpers";
import CollapseWrapper from "../lib/collapse-animator";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import Button from "../lib/button";
import { Fetch, PostFetch } from "../lib/fetch";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import {
  CaretUpIcon,
  CaretDownIcon,
} from "../lib/icon";

/**
 * Settings
 *
 * @function
 * @returns {Element} DOM component
 * @example
 * import {renderer} from '@b9g/crank/dom';
 * renderer.render(<Settings />, document.querySelector('#app'))
 */
function *Settings() {

  /**
   * Display loading indicator while fetching data
   *
   * @member loading
   * @type {boolean}
   */
  let loading = true;
  /**
   * If fetching data was unsuccessful.
   *
   * @member fetchError
   * @type {object|string|null}
   */
  let fetchError = null;
  /**
   * Settings fetched from api as object keyed by handle (see saveSettings)
   *
   * @member {object} fetchSettings
   */
  let allSettings = {};
  /**
   * Settings fetched from api as array grouped by tag trimmed for accessibility
   *
   * @member {object} fetchSettings
   */
  let fetchSettings = {};
  /**
   * Settings sent up from SettingsAppView on hover
   *
   * @member {object} selectedSettings
   */
  let selectedSettings = {};
  /**
   * General settings are collapsible
   *
   * @member {object} collapsedSettings
   */
  let collapsedGeneral = true;
  /**
   * Translation settings are collapsible
   *
   * @member {object} collapsedSettings
   */
  let collapsedTranslation = true;

  this.addEventListener("toastEvent", Toaster);

  /**
   * Fetch settings data on mounting of component
   *
   * @function getSettings
   */
  const getSettings = () => {
    let uri = "/api/current-settings";
    Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          loading = false;
          json.forEach(el => {
            fetchSettings[el._id] = {}; // for this component
            el.settings.forEach(setting => {
              allSettings[setting.handle] = setting;
              fetchSettings[el._id][setting.handle] = [setting.note, setting.value];
            });
          });
          if (document.getElementById("settings-table")) {
            animateFadeForAction("settings-table", async () => await this.refresh());
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

  /** Provide access to the app settings
   *
   * @method {object} getSetting
   * @returns {array} [note, value, handle]
   */
  const getSetting = (type, key) => {
    if (hasOwnProp.call(fetchSettings, type)) {
      const settings = fetchSettings[type];
      if (hasOwnProp.call(settings, key)) {
        return [ ...settings[key], key];
      };
    };
    return "";
  };

  /**
   * Event handler when {@link
   * module:form/form-modal~FormModalWrapper|FormModalWrapper} saves the data
   *
   * @function reloadBoxes
   * @param {object} ev The event
   * @listens listing.reload
   */
  const reloadSettings = (ev) => {
    getSettings();
  };

  this.addEventListener("listing.reload", reloadSettings);

  /**
   * Event handler when editing is cancelled by user
   *
   * @function cancelEdit
   * @param {object} ev The event
   */
  const cancelEdit = (ev) => {
    selectedSettings = {};
    cancelEdits();
    window.removeEventListener("keyup", escapeEdit);
    return;
    /* done different
    for (const key of ["General", "Translation"]) {
      for (const handle of Object.keys(allSettings)) {
        if (hasOwnProp.call(fetchSettings[key], handle)) {
          if (allSettings[handle].value !== fetchSettings[key][handle][1]) {
            fetchSettings[key][handle][1] = allSettings[handle].value;
          };
        };
      };
    };
    this.refresh();
    */
  };

  /**
   * Event handler when edit is saved by user
   *
   * @function saveEdit
   * @param {object} ev The event
   */
  const saveEdit = async (ev, handle) => {
    const el = document.getElementById(`saveBox-${handle}`);
    if (el) el.classList.add("closed");
    const data = allSettings[handle];
    const input = document.getElementById(handle);
    data.value = input.value.trim();
    const headers = { "Content-Type": "application/json" };
    const { error, json } = await PostFetch({
      src: "/api/edit-setting",
      data,
      headers,
    })
      .then((result) => {
        this.dispatchEvent(toastEvent({
          notice: "Saved setting",
          bgColour: "black",
          borderColour: "black"
        }));
        return result;
      })
      .catch((e) => ({
        error: e,
        json: null,
      }));
    window.removeEventListener("keyup", escapeEdit);
    if (!error) {
      getSettings();
    };
  };

  /**
   * Event handler escape key is pressed
   *
   * @function escapeEdit
   * @param {object} ev The event
   */
  const escapeEdit = (ev) => {
    if (ev.key && ev.key === "Escape") {
      cancelEdits();
    };
  };

  /**
   * Cancel all current edits
   *
   * @function cancelEdits
   */
  const cancelEdits = (id) => {
    const saveBoxes = document.querySelectorAll("div.saveBox:not(.closed)");
    saveBoxes.forEach(el => {
      const handle = el.id.slice(8);
      if (handle !== id) {
        el.classList.add("closed");
        const input = document.getElementById(handle);
        if (input) {
          input.value = allSettings[handle].value;
        };
      };
    });
  };

  getSettings();

  const inputChange = (ev) => {
    const id = ev.target.id;

    // revert any other fields back to fetched data
    cancelEdits(id);

    const el = document.getElementById(`saveBox-${id}`);
    if (el) el.classList.remove("closed");
    window.addEventListener("keyup", escapeEdit);
    return;
  };

  /**
   * Products component - will be wrapped in collapsible component
   *
   * @param {array} products Array of products
   * @param {string} type included or addon
   * @generator Products
   */
  function *PartialSettings ({category}) {

    for (const _ of this) {
      yield (
        <div class="mt1 bb b--black-30" id={ category.toLowerCase() }>
          {hasOwnProp.call(fetchSettings, category) && (
            <Fragment>
              {Object.keys(fetchSettings[category]).map(setting => getSetting(category, setting)).map(el => (
                <div class="w-100">
                  <label
                    for={el[2]}
                    class="db mb2 mt4">
                    <div class="db mb2">{el[2]}</div>
                    <div class="db b">{el[0]}</div>
                    </label>
                  <textarea 
                    id={el[2]}
                    name="setting"
                    class="input-reset ba b--black-20 pa2 mv2 db w-100"
                    style="outline: 0"
                    onkeyup={ inputChange }
                  >{ el[1] }</textarea>
                  <div class="tr mv3 w-100 saveBox closed" id={ `saveBox-${el[2]}` }>
                    <Button type="primary" onclick={(ev) => saveEdit(ev, el[2])}>
                      Save
                    </Button>
                    <Button type="secondary" onclick={(ev) => cancelEdit(ev, el[2])}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </Fragment>
          )}
        </div>
      );
    };
  };

  const CollapsibleSettings = CollapseWrapper(PartialSettings);

  /*
   * Control the collapse of general settings
   */
  const toggleCollapse = (type) => {
    if (type === "General") {
      collapsedGeneral = !collapsedGeneral;
    } else if (type === "Translation" ){
      collapsedTranslation = !collapsedTranslation;
    };
    this.refresh();
  };

  for (const _ of this) {
    yield (
      <div class="pb2 w-100">
        {loading && <BarLoader />}
        <div class="mt3" id="settings-table">
          {fetchError && <Error msg={fetchError} />}
          {Object.keys(fetchSettings).length > 0 && (
            <Fragment>
              <div class="mw8 tl center">
                <div>
                  <div class="pb3">
                    <h3 class="fw3 black bb b--black-30 pointer mb0"
                      onclick={ () => toggleCollapse("General") }
                      >
                      General Settings
                      <span class="v-mid">
                        {collapsedGeneral ? <CaretDownIcon /> : <CaretUpIcon />}
                      </span>
                    </h3>
                    <CollapsibleSettings collapsed={collapsedGeneral} id="general-settings" category="General" />
                  </div>
                  <div class="pb3">
                    <h3 class="fw3 black bb b--black-30 pointer mb0"
                      onclick={ () => toggleCollapse("Translation") }
                      >
                      Translation Settings
                      <span class="v-mid">
                        {collapsedTranslation ? <CaretDownIcon /> : <CaretUpIcon />}
                      </span>
                    </h3>
                    <CollapsibleSettings collapsed={collapsedTranslation} id="translation-settings" category="Translation" />
                  </div>
                </div>
              </div>
              <div class="cf"></div>
            </Fragment>
          )}
        </div>
      </div>
    );
  };
}

export default Settings;
