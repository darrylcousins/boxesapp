/**
 * Creates element to render a page to edit the cancel options presented to customer
 *
 * @module app/components/recharge/cancel-options
 * @exports CoreBoxModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal } from "@b9g/crank";
import { DragIcon, AddIcon, CaretUpIcon, CaretDownIcon, CloseIcon, DeleteIcon } from "../lib/icon";
import { PostFetch, Fetch } from "../lib/fetch";
import Button from "../lib/button";
import Error from "../lib/error";
import BarLoader from "../lib/bar-loader";
import IconButton from "../lib/icon-button";
import Form from "../form";
import Field from "../form/fields";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import { animateFadeForAction } from "../helpers";

/**
 * Creates element to render a page to edit cancel options
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {object} props.order The order to be displayed
 */
function* CancelOptions() {
  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Fetch errors
   *
   * @member {boolean} fetchError
   */
  let fetchError = false;
  /**
   * Adding a new field
   *
   * @member {boolean} adding
   */
  let adding = false;
  /**
   * Showing buttons if changes made
   *
   * @member {boolean} buttons
   */
  let buttons = false;
  /**
   * Form data collected
   *
   * @member {object} formData
   */
  const formData = { newoption: "" };
  /**
   * Form elements
   *
   * @member {object} formElements
   */
  const formElements = {};
  /**
   * Fetched Cancel Options
   *
   * @member {boolean} cancelOptions
   */
  let cancelOptions = null;

  /**
   * Build form data and elements
   *
   * @function buildFormData
   */
  const buildFormData = async (options) => {
    formData.newoption = "";
    for (const [option, slug] of options) {
      formData[slug] = option;
      formElements[slug] = {};
      formElements[slug].checkValidity = () => true;
      formElements[slug].value = option;
    };
  };

  /**
   * Fetch current cancel options
   *
   * @function getBoxes
   */
  const getCancelOptions = async () => {
    let uri = `/api/recharge-get-cancel-options`;
    await Fetch(uri)
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          if (json.options && json.options.length) { // may be null if all deleted
            cancelOptions = json.options.map(el => [el, slugify(el)]);
          } else {
            cancelOptions = [];
          };
          // reset formData
          buildFormData(cancelOptions);
          loading = false;
          await this.refresh();
          initSortable();
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  /**
   * Toggle add form
   *
   * @member {function} toggleAddForm
   */
  const toggleAddForm = () => {
    adding = !adding;
    this.refresh();
  };

  /**
   * Pick up all changes to form inputs, update formData object and refresh
   * component after refetching fields
   *
   * @function onChange
   * @returns {null}
   */
  const onChange = (ev) => {
    const value = ev.target.value.toString();
    const idx = ev.target.getAttribute("data-idx");
    if (ev.target.id !== "newoption") {
      cancelOptions[idx] = [value, ev.target.id];
    };
    formData[ev.target.id] = value;
    formElements[ev.target.id].value = value;
    buttons = value !== "";
    this.refresh();
  };

  /**
   * Save the changes made
   *
   * @member {function} saveChanges
   */
  const saveChanges = async () => {
    // maintain index order
    const data = cancelOptions.map(([value, slug]) => value);
    if (formData.newoption !== "") data.push(formData.newoption);
    const headers = { "Content-Type": "application/json" };
    const { error, json } = await PostFetch({
      src: "/api/recharge-update-cancel-options",
      data: { options: data },
      headers,
    })
      .then((result) => result)
      .catch((e) => ({
        error: e,
        json: null,
      }));
    await getCancelOptions();
    const notice = `Updated cancel options`;
    this.dispatchEvent(toastEvent({
      notice,
      bgColour: "black",
      borderColour: "black"
    }));
    buttons = false;
    adding = false;
    const wrapper = document.getElementById("options-wrapper");
    animateFadeForAction(wrapper, () => this.refresh());
  };

  /**
   * Remove an options - not saved until saveChanges
   *
   * @member {function} removeOption
   */
  const removeOption = async (idx) => {
    cancelOptions.splice(idx, 1);
    buildFormData(cancelOptions);
    const notice = `Removed option`;
    this.dispatchEvent(toastEvent({
      notice,
      bgColour: "black",
      borderColour: "black"
    }));
    buttons = true;
    adding = false;
    const wrapper = document.getElementById("options-wrapper");
    animateFadeForAction(wrapper, () => this.refresh());
  };

  /**
   * Cancel the changes made
   *
   * @member {function} changeChanges
   */
  const cancelChanges = async () => {
    formData["newoption"] = "";
    const notice = `Changes cancelled`;
    await getCancelOptions();
    this.dispatchEvent(toastEvent({
      notice,
      bgColour: "black",
      borderColour: "black"
    }));
    buttons = false;
    adding = false;
    const wrapper = document.getElementById("options-wrapper");
    animateFadeForAction(wrapper, () => this.refresh());
  };

  /**
   * Field options
   */
  const getFieldOptions = (fieldId) => {
    const id = fieldId ? fieldId : "newoption";
    return {
      id,
      type: "text",
      datatype: "string",
      size: "90",
      required: true,
      placeholder: "String of text to be displayed to user",
      disabled: false,
      onkeyup: onChange,
      style: {"margin-bottom":"5px"},
    };
  };

  /**
   * Field element
   */
  const getFormElements = () => {
    formElements.newoption = {};
    formElements.newoption.value = formData.newoption;
    formElements.newoption.checkValidity = () => false;
    return formElements;
  };

  /**
   * For messaging user
   */
  this.addEventListener("toastEvent", Toaster);

  getCancelOptions();

  /**
   * For sorting the list
   */
  const initSortable = () => {
    const items = document.querySelectorAll(".draggable");
    let currentItem = null;
    for (let item of items) {
      item.draggable = true;

      item.ondragstart = (ev) => {
        currentItem = item;
        for (let it of items) {
          if (it != currentItem) { it.classList.add("hint"); }
        };
      };
      item.ondragenter = (ev) => {
        if (item != currentItem) { item.classList.add("active"); }
      };
      item.ondragover = (ev) => {
        ev.preventDefault();
        if (item != currentItem) { item.classList.add("active"); }
      };
      item.ondragleave = (ev) => item.classList.remove("active");
      item.ondragend = (ev) => {
        for (let it of items) {
          it.classList.remove("active");
          it.classList.remove("hint");
        };
      };
      item.ondrop = (ev) => {
        ev.preventDefault();
        const newIndex = item.getAttribute("data-idx");
        const oldIndex = currentItem.getAttribute("data-idx");
        cancelOptions.splice(newIndex, 0, cancelOptions.splice(oldIndex, 1)[0]);
        buttons = true;
        this.refresh()
        // and need to save it
      };
    };
  };

  const slugify = (str) => {
    return str.toLowerCase().replace(/ /g, "_");
  };

  for (const _ of this) { // eslint-disable-line no-unused-vars

    yield (
      <div id="options" class="w-80 center pv2">
        { loading && <BarLoader /> }
        { fetchError && <Error msg={fetchError} /> }
        <div class="tl pb3">
          <h4 class="pt0 lh-title ma0 fg-streamside-maroon">
            Edit The Cancel Options
          </h4>
        </div>
        <div id="options-wrapper" class="pt3">
          { cancelOptions && (
            cancelOptions.map(([value, slug], idx) => (
              <div class="draggable cf tc w-100 mb3 pb0" data-idx={idx}>
                <div class="handle fl pa2 ma0 mt2 dib">
                  <DragIcon />
                </div>
                <Field
                  label={ `Option` }
                  hideLabel={true}
                  options={getFieldOptions(slug)}
                  data={formData}
                  index={idx}
                  id={ slug }
                  formElements={getFormElements()}
                />
                <div class="dib mt3" onclick={ () => removeOption(idx) }>
                  <IconButton color="dark-red" title="Delete Option" name="Delete Option">
                    <DeleteIcon />
                  </IconButton>
                </div>
              </div>
            ))
          )}
          { adding ? (
            <div class="cf tc w-100">
              <Field
                label={ `New Option` }
                hideLabel={false}
                options={getFieldOptions()}
                data={formData}
                index={cancelOptions.length}
                id="newoption"
                formElements={getFormElements()}
              />
            </div>
          ) : (
            <div class="tr w-100 pr4" onclick={ toggleAddForm }>
              <IconButton color="navy" title="Add new field" name="Add new field">
                <AddIcon />
              </IconButton>
            </div>
          )}
          { buttons && (
            <div class="tr pr2 pb2 w-100">
              <Button type="primary" onclick={saveChanges}>
                Save
              </Button>
              <Button type="secondary" onclick={cancelChanges}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };
}

export default CancelOptions;

