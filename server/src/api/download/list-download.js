/*
 * @module api/download/picking-list-download.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import Excel from "exceljs";
import { buildPackingSheet, buildPickingSheet } from "../../lib/picking.js";
import { collatePickingData, collatePackingData, getQueryFilters } from "../../lib/orders.js";
import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function download/picking-list-download.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const deliveryDay = getNZDeliveryDay(req.params.timestamp);
  const query = getQueryFilters(req, {delivered: deliveryDay});
  const packingData = await collatePackingData({req, deliveryDay, query});
  const pickingData = await collatePickingData({req, deliveryDay, query});

  try {
    const workbook = new Excel.Workbook();
    const packingSheet = buildPackingSheet(packingData, workbook.addWorksheet('Packing List'));
    const pickingSheet = buildPickingSheet(pickingData, workbook.addWorksheet('Picking List'));

    let fileName = `picking-sheet-${deliveryDay.replace(/ /g, '-').toLowerCase()}.xlsx`; // The name of the spreadsheet
    if (Object.hasOwnProperty.call(query, 'pickup')) {
      const testDate = new Date(query.pickup);
      fileName = (testDate === NaN) ? fileName :  `picking-sheet-${testDate.toDateString().replace(/ /g, '-').toLowerCase()}.xlsx`;
    };

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-disposition': `attachment; filename=${fileName}`
    })
    workbook.xlsx.write(res).then(function(){
      res.end();
    });
  } catch (err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  }
};
