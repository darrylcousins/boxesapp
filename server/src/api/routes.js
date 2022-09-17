import express from "express";
/* XXX consider also express-fileupload
import multer from "multer";
const upload = multer();
*/

const router = express.Router();
router.get('/', function (req, res) {
  res.status(404).send('No index for the api');
})
router.post(
  "/add-box", 
  await import("./box/add-box.js").then(({ default: fn }) => fn));
router.post(
  "/toggle-box-active", 
  await import("./box/toggle-box-active.js").then(({ default: fn }) => fn));
router.post(
  "/add-product-to-box", 
  await import("./box/add-product-to-box.js").then(({ default: fn }) => fn));
router.get(
  "/box-by-date-and-product/:product_id/:timestamp", 
  await import("./box/box-by-date-and-product.js").then(({ default: fn }) => fn));
router.get(
  "/box-by-date-and-title/:product_title/:timestamp", 
  await import("./box/box-by-date-and-title.js").then(({ default: fn }) => fn));
router.post(
  "/create-core-box", 
  await import("./box/create-core-box.js").then(({ default: fn }) => fn));
router.get(
  "/current-box-dates", 
  await import("./box/current-box-dates.js").then(({ default: fn }) => fn));
router.get(
  "/current-box-titles-days", 
  await import("./box/current-box-titles-days.js").then(({ default: fn }) => fn));
router.get(
  "/current-boxes-by-date/:timestamp", 
  await import("./box/current-boxes-by-date.js").then(({ default: fn }) => fn));
router.get(
  "/titles-for-date/:timestamp", 
  await import("./box/titles-for-date.js").then(({ default: fn }) => fn));
router.get(
  "/dates-for-title/:product_title", 
  await import("./box/dates-for-title.js").then(({ default: fn }) => fn));
router.get(
  "/current-boxes-by-product/:product_id/:weekday", 
  await import("./box/current-boxes-by-product.js").then(({ default: fn }) => fn));
router.get(
  "/current-boxes-by-product/:product_id", 
  await import("./box/current-boxes-by-product.js").then(({ default: fn }) => fn));
router.get(
  "/current-boxes-for-box-product/:box_product_id", 
  await import("./box/current-boxes-for-box-product.js").then(({ default: fn }) => fn));
router.post(
  "/delete-core-box", 
  await import("./box/delete-core-box.js").then(({ default: fn }) => fn));
router.post(
  "/duplicate-box", 
  await import("./box/duplicate-box.js").then(({ default: fn }) => fn));
router.post(
  "/duplicate-boxes", 
  await import("./box/duplicate-boxes.js").then(({ default: fn }) => fn));
router.get(
  "/get-core-box", 
  await import("./box/get-core-box.js").then(({ default: fn }) => fn));
router.get(
  "/get-product-by-title/:product_title", 
  await import("./box/get-product-by-title.js").then(({ default: fn }) => fn));
router.post(
  "/remove-box", 
  await import("./box/remove-box.js").then(({ default: fn }) => fn));
router.post(
  "/remove-boxes", 
  await import("./box/remove-boxes.js").then(({ default: fn }) => fn));
router.post(
  "/remove-product-from-box", 
  await import("./box/remove-product-from-box.js").then(({ default: fn }) => fn));
router.get(
  "/orders-download/:timestamp", 
  await import("./download/orders-download.js").then(({ default: fn }) => fn));
router.get(
  "/list-download/:timestamp", 
  await import("./download/list-download.js").then(({ default: fn }) => fn));
router.get(
  "/current-logs", 
  await import("./log/current-logs.js").then(({ default: fn }) => fn));
router.get(
  "/current-logs/:level", 
  await import("./log/current-logs.js").then(({ default: fn }) => fn));
router.get(
  "/current-logs/:level/:object", 
  await import("./log/current-logs.js").then(({ default: fn }) => fn));
router.get(
  "/get-reconciled-box/:timestamp/:product_title", 
  await import("./order/get-reconciled-box.js").then(({ default: fn }) => fn));
router.get(
  "/get-reconciled-box/:timestamp/:product_title/:order_id", 
  await import("./order/get-reconciled-box.js").then(({ default: fn }) => fn));
router.post(
  "/add-order", 
  await import("./order/add-order.js").then(({ default: fn }) => fn));
router.post(
  "/bulk-edit-orders", 
  await import("./order/bulk-edit-orders.js").then(({ default: fn }) => fn));
router.get(
  "/current-orders-by-date/:timestamp", 
  await import("./order/current-orders-by-date.js").then(({ default: fn }) => fn));
router.get(
  "/current-order-dates", 
  await import("./order/current-order-dates.js").then(({ default: fn }) => fn));
router.post(
  "/edit-order", 
  await import("./order/edit-order.js").then(({ default: fn }) => fn));
router.post(
  "/import-orders", 
  await import("./order/import-orders.js").then(({ default: fn }) => fn));
router.get(
  "/order-fields", 
  await import("./order/order-fields.js").then(({ default: fn }) => fn));
router.post(
  "/order-sources", 
  await import("./order/order-sources.js").then(({ default: fn }) => fn));
router.get(
  "/orders-by-ids", 
  await import("./order/orders-by-ids.js").then(({ default: fn }) => fn));
router.get(
  "/packing-list/:timestamp", 
  await import("./order/packing-list.js").then(({ default: fn }) => fn));
router.get(
  "/picking-list/:timestamp", 
  await import("./order/picking-list.js").then(({ default: fn }) => fn));
router.post(
  "/remove-order", 
  await import("./order/remove-order.js").then(({ default: fn }) => fn));
router.post(
  "/remove-orders", 
  await import("./order/remove-orders.js").then(({ default: fn }) => fn));
router.get(
  "/recharge-customer-charges/:customer_id", 
  await import("./recharge/recharge-customer-charges.js").then(({ default: fn }) => fn));
router.get(
  "/recharge-customer-charges/:customer_id/:address_id/:scheduled_at", 
  await import("./recharge/recharge-customer-charges.js").then(({ default: fn }) => fn));
router.get(
  "/recharge-customer/:shopify_customer_id", 
  await import("./recharge/recharge-customer.js").then(({ default: fn }) => fn));
router.post(
  "/recharge-update", 
  await import("./recharge/recharge-update.js").then(({ default: fn }) => fn));
router.post(
  "/recharge-update-charge-date", 
  await import("./recharge/recharge-update-charge-date.js").then(({ default: fn }) => fn));
router.post(
  "/recharge-updated-charge-date", 
  await import("./recharge/recharge-updated-charge-date.js").then(({ default: fn }) => fn));
router.post(
  "/recharge-cancel-subscription", 
  await import("./recharge/recharge-cancel-subscription.js").then(({ default: fn }) => fn));
router.post(
  "/recharge-delete-subscription", 
  await import("./recharge/recharge-delete-subscription.js").then(({ default: fn }) => fn));
router.post(
  "/recharge-reactivate-subscription", 
  await import("./recharge/recharge-reactivate-subscription.js").then(({ default: fn }) => fn));
router.post(
  "/recharge-reactivated-subscription", 
  await import("./recharge/recharge-reactivated-subscription.js").then(({ default: fn }) => fn));
router.post(
  "/recharge-subscription-update", 
  await import("./recharge/recharge-subscription-update.js").then(({ default: fn }) => fn));
router.get(
  "/recharge-subscription/:subscription_id", 
  await import("./recharge/recharge-subscription.js").then(({ default: fn }) => fn));
router.get(
  "/recharge-subscriptions/:customer_id", 
  await import("./recharge/recharge-subscriptions.js").then(({ default: fn }) => fn));
router.get(
  "/recharge-cancelled-subscriptions/:customer_id", 
  await import("./recharge/recharge-cancelled-subscriptions.js").then(({ default: fn }) => fn));
router.post(
  "/recharge-cancelled-subscriptions", 
  await import("./recharge/recharge-cancelled-subscriptions.js").then(({ default: fn }) => fn));
router.get(
  "/recharge-subscriptions/:customer_id/:next_charge_scheduled_at/:address_id", 
  await import("./recharge/recharge-subscriptions.js").then(({ default: fn }) => fn));
router.get(
  "/recharge-subscriptions/:customer_id/:next_charge_scheduled_at/:address_id/:box_subscription_id", 
  await import("./recharge/recharge-subscriptions.js").then(({ default: fn }) => fn));
router.post(
  "/add-setting", 
  await import("./setting/add-setting.js").then(({ default: fn }) => fn));
router.get(
  "/box-rules-for-app", 
  await import("./setting/box-rules-for-app.js").then(({ default: fn }) => fn));
router.get(
  "/current-box-rules", 
  await import("./setting/current-box-rules.js").then(({ default: fn }) => fn));
router.get(
  "/current-settings/:tag", 
  await import("./setting/current-settings.js").then(({ default: fn }) => fn));
router.get(
  "/current-settings", 
  await import("./setting/current-settings.js").then(({ default: fn }) => fn));
router.post(
  "/edit-box-setting", 
  await import("./setting/edit-box-setting.js").then(({ default: fn }) => fn));
router.post(
  "/edit-setting", 
  await import("./setting/edit-setting.js").then(({ default: fn }) => fn));
router.post(
  "/edit-settings", 
  await import("./setting/edit-settings.js").then(({ default: fn }) => fn));
router.post(
  "/add-box-rule", 
  await import("./setting/add-box-rule.js").then(({ default: fn }) => fn));
router.post(
  "/edit-box-rule", 
  await import("./setting/edit-box-rule.js").then(({ default: fn }) => fn));
router.post(
  "/remove-setting", 
  await import("./setting/remove-setting.js").then(({ default: fn }) => fn));
router.get(
  "/settings-for-app", 
  await import("./setting/settings-for-app.js").then(({ default: fn }) => fn));
router.post(
  "/query-store-boxes", 
  await import("./shopify/query-store-boxes.js").then(({ default: fn }) => fn));
router.post(
  "/query-store-products", 
  await import("./shopify/query-store-products.js").then(({ default: fn }) => fn));
router.get(
  "/shopify-box-price/:product_id/:variant_id", 
  await import("./shopify/shopify-box-price.js").then(({ default: fn }) => fn));
router.get(
  "/shopify-product-image/:product_title", 
  await import("./shopify/shopify-product-image.js").then(({ default: fn }) => fn));
router.get(
  "/shopify-customer/:customer_id", 
  await import("./shopify/shopify-customer.js").then(({ default: fn }) => fn));

export default router;
