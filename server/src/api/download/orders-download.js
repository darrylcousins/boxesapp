/*
 * @module api/download/orders-download.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import Excel from "exceljs";
import { capWords, matchNumberedString, sortObjectArrayByKey } from "../../lib/helpers.js";
import { NODELIVER_STRING, headersFull } from "../../lib/constants.js";
import { getQueryFilters } from "../../lib/orders.js";
import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function download/orders-download.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const deliveryDay = getNZDeliveryDay(req.params.timestamp);
  const collection = _mongodb.collection("orders");
  const query = getQueryFilters(req, {
    delivered: { $in: [deliveryDay, NODELIVER_STRING]}
  });
  try {
    const orders = await collection.find(query).toArray();
    const result = sortObjectArrayByKey(orders, 'product_title');

    const workbook = new Excel.Workbook();

    let fileName = `box-orders-${deliveryDay.replace(/ /g, '-').toLowerCase()}.xlsx`; // The name of the spreadsheet
    if (Object.hasOwnProperty.call(query, 'pickup')) {
      const testDate = new Date(query.pickup);
      fileName = (testDate === NaN) ? fileName :  `box-orders-${testDate.toDateString().replace(/ /g, '-').toLowerCase()}.xlsx`;
    };

    const worksheet = workbook.addWorksheet("Orders");

    worksheet.columns = headersFull.map(el => {
      return {
        header: el,
        width: 15,
        key: el.replace(' #', '').replace(' ', '').toLowerCase(),
        style: { font: { name: 'Arial' } }
      };
    });

    result.forEach(order => {

      // collect incremented item count in included items and add to extras list
      const extras = order.addons;
      order.including.forEach(product => {
        let { product_title, count } = matchNumberedString(product);
        if (count === 2) {
          extras.push(product_title);
        } else if (count > 2) {
          extras.push(`${product_title} (${count - 1})`);
        };
      });
      extras.sort();

      const source = (typeof order.source === 'string')
        ? order.source
        : `${order.source.name}, ${capWords(order.source.type.split("_")).join(" ")}`;

      const row = worksheet.addRow(
        {
          logo: '',
          box: order.product_title,
          deliveryday: order.delivered,
          order: order.order_number,
          runid: '',
          firstname: order.first_name,
          lastname: order.last_name,
          addressline: order.address1,
          suburb: order.address2,
          city: order.city,
          postcode: order.zip,
          telephone: order.phone,
          excluding: order.removed.join('\n'),
          extras: extras.join('\n'),
          swaps: order.swaps.join('\n'),
          deliverynote: order.note,
          shopnote: order.shopnote ? order.shopnote : '',
          source: source
        }
      );
      Array.from({length: 18}, (_, i) => i + 1).forEach(num => row.getCell(num).font = { name: 'Arial' });
    });

    try {
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-disposition': `attachment; filename=${fileName}`
      })
      workbook.xlsx.write(res).then(function(){
        res.end();
      });
    } catch(err) {
      res.status(400).json({ error: err.toString() });
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      return;
    };

  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return; // do we need this??
  };

};
