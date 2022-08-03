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
      title: 'Pickup Date',
      id: 'pickup'
    }
  ];
  /**
   * Form filter field
   *
   * @member {boolean} filter_field
   */
  let filter_field = fields[0].id;
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
    updateFilter({
      filter_field,
      filter_value: new Date(Date.parse(filter_value)).getTime(),
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
              <h6 class="fw4 tl fg-streamside-maroon">Filter Options</h6>
              <div class="flex w-100 mb3">
                <div class="w-50">
                  <div class="tl ph2 mt1 ml0">
                    <label class="fw6 lh-copy" htmlFor="field" for="field">
                      Field
                    </label>
                    <select
                      class="mr1 pa2 ba bg-transparent hover-bg-near-white w-100 input-reset br2"
                      id="field"
                    >
                      {fields.map(field => (
                        <option
                          selected={field.id === filter_field}
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
                      type="date"
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
