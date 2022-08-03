
/**
 * Event dispatched by Product selectors in ProductSelector
 * Listened for by ContainerBox and moves products between lists
 *
 * @function moveProductEvent
 * @param {string} product The id
 * @param {string} from Identify the from list
 * @param {string} to Identify the target list
 */
export const moveProductEvent = (id, from, to) =>
  new CustomEvent("moveProductEvent", {
    bubbles: true,
    detail: { id, from, to },
  });

/**
 * Event dispatched by VariantSelector and listened for by ContainerBox
 * @function selectVariantEvent
 * @param {string} variant The variant selected, an object {id, title ...}
 */
export const selectVariantEvent = (variant) =>
  new CustomEvent("selectVariantEvent", {
    bubbles: true,
    detail: { variant },
  });

/**
 * Event dispatched by SellingPlanSelector and listened for by ContainerBox
 * @function selectSellingPlanEvent
 * @param {number} selling_plan_id The selling plan id selected
 */
export const selectSellingPlanEvent = (selling_plan_id) =>
  new CustomEvent("selectSellingPlanEvent", {
    bubbles: true,
    detail: { selling_plan_id },
  });

/**
 * Event dispatched by DateSelector and listened for by ContainerBox
 * @function selectDateEvent
 * @param {string} date The date string selected,
 */
export const selectDateEvent = (date) =>
  new CustomEvent("selectDateEvent", {
    bubbles: true,
    detail: { date },
  });

/**
 * Event dispatched by date selection on container display, the intention is to
 * use this to close other views
 * @function containerDateSelect
 * @param {number} id The box id
 */
export const containerDateSelectEvent = (boxId) =>
  new CustomEvent("containerDateSelectEvent", {
    bubbles: true,
    detail: { boxId },
  });

/**
 * Event dispatched by all selectors so that the others can be closed if open
 * Really wierd error caused by this so it is no longer used
 * @function selectorOpen
 * @param {string} selector The string indentifier that is open, the rest will close
 */
export const selectorOpenEvent = (selector) =>
  new CustomEvent("selectorOpenEvent", {
    bubbles: true,
    detail: { selector },
  });

/**
 * Event dispatched by quantity form when quantity updated
 * @function quantityUpdateEvent
 * @param {string} product The id
 * @param {string} from Identify the from list
 * @param {string} to Identify the target list
 */
export const quantityUpdateEvent = (id, quantity, list) =>
  new CustomEvent("quantityUpdateEvent", {
    bubbles: true,
    detail: { id, quantity, list },
  });
