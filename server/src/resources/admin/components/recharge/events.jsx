/**
 * @function loadAnotherCustomer
 */
export const loadAnotherCustomer = () =>
  new CustomEvent("loadAnotherCustomer", {
    bubbles: true,
  });
/**
 * @function reloadCustomers
 */
export const reloadCustomers = () =>
  new CustomEvent("reloadCustomers", {
    bubbles: true,
  });
