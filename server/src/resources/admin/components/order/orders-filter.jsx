/**
 * Creates element to render modal form for filter orders.
 *
 * @module app/components/orders-filter
 * @exports FilterOrders
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal } from "@b9g/crank";

import { CloseIcon, FilterIcon } from "../lib/icon";
import Button from "../lib/button";
import Error from "../lib/error";
import ModalTemplate from "../lib/modal-template";

/**
 * Creates element to render a modal for selecting order filter.
 *
 * @generator
 * @yields {Element}
 */
function* FilterOrders({updateFilter}) {

  /**
   * Fields we can filter on
   *
   * @member {boolean} fields
   */
  let fields = [
    {
      title: "Pickup Date",
      id: "pickup",
      input_type: "date",
      type: "date",
      hint: "Select date",
    },
    {
      title: "Postcode",
      id: "zip",
      input_type: "text",
      type: "array",
      hint: "A postcode or a list of comma separated values",
    }
  ];
  /**
   * Form errors
   *
   * @member {string} formError
   */
  let formError = null;
  /**
   * Form filter field
   *
   * @member {boolean} filter_field
   */
  let filter_field = fields[0];
  /**
   * Form filter value
   *
   * @member {string} filter_value
   */
  let filter_value = "";
  /**
   * Is the modal visible?
   *
   * @member {boolean} visible
   */
  let visible = false;

  /**
   * Action which closes the modal and refreshes component. Normally attached
   * to the modal `close` button and the `cancel` button.
   *
   * @function closeModal
   */
  const closeModal = () => {
    visible = false;
    this.refresh();
  };

  /**
   * Action which opens the modal and refreshes component
   *
   * @function showModal
   */
  const showModal = () => {
    visible = true;
    this.refresh();
  };

  /**
   * Select the filter, one of fields
   *
   * @function selectFilter
   */
  const selectFilter = async (ev) => {
    filter_field = fields.find(el => el.id === ev.target.options[ev.target.selectedIndex].value);
    this.refresh();
  };

  /**
   * Control the value field
   *
   * @function updateValue
   */
  const updateValue = async (value) => {
    filter_value = value;
    this.refresh();
  };

  /**
   * User has clicked apply, set the filter
   *
   * @function setFilter
   */
  const setFilter = async (ev) => {
    let value;
    let error;
    if (filter_field.type === "date") {
      value = new Date(Date.parse(filter_value)).getTime();
      if (isNaN(value)) error = "Please select a date";
    } else if (filter_field.type === "array") {
      if (filter_value.length === 0) {
        error = "Please input a postcode or a list of comma separated values";
      } else {
        value = filter_value.split(",").map(el => el.trim()).filter(el => el.length > 0);
      };
    };
    if (error) {
      formError = error;
      return this.refresh();
    } else {
      formError = null;
    };
    updateFilter({
      filter_field: filter_field.id,
      filter_value: value,
      filter_type: filter_field.type,
    });
    closeModal();
  };

  /**
   * Hide the modal on escape key
   *
   * @function hideModal
   * @param {object} ev Event emitted
   * @listens window.keyup
   */
  const hideModal = async (ev) => {
    if (ev.key && ev.key === "Escape") {
      closeModal();
    }
  };

  this.addEventListener("keyup", hideModal);

  const main = document.getElementById("modal-window");

  for (const _ of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <button
          class={`dib w-20 outline-0 dark-gray b--dark-green ba bg-transparent mv1 pointer`}
          title="Filter the listing"
          type="button"
          onclick={showModal}
          >
            <span class="v-mid di">Filters</span>
            <span class="v-mid">
              <FilterIcon />
            </span>
        </button>
        <Portal root={ main }>
          {visible && (
            <ModalTemplate closeModal={ closeModal } loading={ false } error={ false } withClose={ false }>
              <h3 class="fw4 tl fg-streamside-maroon">Filter Options</h3>
              {formError && <Error msg={formError} />}
              <h4 class="fw4 tl fg-streamside-maroon">Filter by { filter_field.title }</h4>
              <div>{ filter_field.hint }</div>
              <div class="flex w-100 mb3">
                <div class="w-50">
                  <div class="tl ph2 mt1 ml0">
                    <label class="fw6 lh-copy" htmlFor="field" for="field">
                      Field
                    </label>
                    <select
                      class="mr1 pa2 ba bg-transparent hover-bg-near-white w-100 input-reset br2"
                      id="field"
                      onchange={ selectFilter }
                    >
                      {fields.map(field => (
                        <option
                          selected={field.id === filter_field.id}
                          value={field.id}>{field.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div class="w-50">
                  <div class="tl pl2 mt1 ml0">
                    <label class="fw6 lh-copy" htmlFor="filter" for="filter">
                      Value
                    </label>
                    <input
                      class="mr1 pa2 ba bg-transparent hover-bg-near-white w-100 input-reset br2"
                      type={ filter_field.input_type }
                      value={filter_value}
                      id="filter"
                      onchange={(ev) => updateValue(ev.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div class="w-100 tr">
                <Button type="primary" onclick={setFilter}>
                  Apply Filters
                </Button>
                <Button type="secondary" onclick={closeModal}>
                  Cancel
                </Button>
              </div>
            </ModalTemplate>
          )}
        </Portal>
      </Fragment>
    );
  };
};

export default FilterOrders;
