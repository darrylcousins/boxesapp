/**
 * Event dispatched by SelectModal 
 * Listened for by Subscription and moves products between lists
 *
 * /

/**
 * @function selectProductEvent
 * @param {string} id The id
 */
export const selectProductEvent = (id) =>
  new CustomEvent("selectProductEvent", {
    bubbles: true,
    detail: { id },
  });

/**
 * @function subscriptionChanged
 */
export const subscriptionChanged = () =>
  new CustomEvent("subscriptionChanged", {
    bubbles: true,
  });

/*
 * @function giveNotice
 * @param {object} options notice (text) bgColour, borderColour
 */
export const giveNotice = (options) =>
  new CustomEvent("giveNotice", {
    bubbles: true,
    detail: options,
  });

/**
 * @function loadAnotherCustomer
 */
export const loadAnotherCustomer = () =>
  new CustomEvent("loadAnotherCustomer", {
    bubbles: true,
  });

/**
 * @function showActionModal
 * @param {object} options Options for the modal
 */
export const showActionModalEvent = (options) =>
  new CustomEvent("showActionModalEvent", {
    bubbles: true,
    detail: options,
  });

/**
 * @function requiredActionCallbackEvent
 * @param {object} options Options for the modal
 */
export const requiredActionCallbackEvent = (options) =>
  new CustomEvent("requiredActionCallbackEvent", {
    bubbles: true,
    detail: options,
  });
