/*
 * @module api/order/import-orders.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * This is no longer part of the admin ui
 */

/*
 * @function order/import-orders.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // post file for import
  // first figure if bucky or csa
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(200).json({ error: 'No files were uploaded.' });
  };
  if (req.files.hasOwnProperty('orders')) {
    const orders = req.files.orders;
    const delivered = req.body.delivered; // uploading to this date only
    const collection = _mongodb.collection("orders");

    if (orders.mimetype !== 'text/csv' && orders.mimetype !== 'application/vnd.ms-excel' && orders.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return res.status(200).json({ error: 'Could not parse data. Uploaded file should be a csv or xlsx file.' });
    };
    let result = true;
    _logger.info(`${_filename(import.meta)} Uploading order for ${delivered} using ${orders.mimetype}`);
    if (orders.mimetype === 'text/csv' || orders.mimetype === 'application/vnd.ms-excel') {
      result = orderImportCSV(orders.data, delivered, collection);
    } else if (orders.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      result = orderImportXLSX(orders.data, delivered, collection);
    };
    if (result) {
      return res.json(({
        mimetype: orders.mimetype,
        count: result.count ? result.count : true,
        delivered,
        success: 'Got file' }));
    } else {
      return res.status(200).json({ error: 'Import failed. An error occurred.' });
    }
  };
};
