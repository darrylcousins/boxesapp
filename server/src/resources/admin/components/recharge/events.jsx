/**
 * @function loadAnotherCustomer
 */
export const loadAnotherCustomer = () =>
  new CustomEvent("loadAnotherCustomer", {
    bubbles: true,
  });
