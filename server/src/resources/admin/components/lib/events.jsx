
/*
 * @function toastEvent
 * used by lib/toaster and callers
 * @param {object} options notice (text) bgColour, borderColour
 */
export const toastEvent = (options) =>
  new CustomEvent("toastEvent", {
    bubbles: true,
    detail: options,
  });

/**
 * @function productsChangeEvent
 * @param {string} properties The properties as used in subscription
 * line_items.properties or cart.attributes etc
 */
export const productsChangeEvent = (properties) =>
  new CustomEvent("productsChangeEvent", {
    bubbles: true,
    detail: properties,
  });

/**
 * @function selectProductEvent
 * @param {string} id The id
 */
export const selectProductEvent = (id) =>
  new CustomEvent("selectProductEvent", {
    bubbles: true,
    detail: { id },
  });
