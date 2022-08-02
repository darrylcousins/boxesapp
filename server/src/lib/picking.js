/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
/**
 * collect the boxes for this delivery day
 * collect the count of orders for each box
 * collate the products in each box by tag
 * collate the included breads along with their count
 * and then some meta data
 *
 */
export const getPackingData = async (query) => {

  const pipeline = [
    // match orders to query
    { "$match": query },
    { "$project": {
      "products": "$includedProducts",
      "title": "$shopify_title",
      "id": "$shopify_product_id",
      "delivered": "$delivered",
    }},
    //{ "$unwind": "$products" },
    { "$group": { 
      "_id": "$products.shopify_tag",
      "products": { "$addToSet": "$products.shopify_title" },
      "title": { "$first": "$title" },
      "id": { "$first": "$id" },
      "delivered": { "$first": "$delivered" },
    }},
    { "$project": {
      "_id": "$id",
      "title": "$title",
      "delivered": "$delivered",
      "zip": {
        "$zip": {
          "inputs": [
            { "$arrayElemAt": [ "$products", 0 ] }, "$_id"
          ]
      }},
    }},
    { "$project": {
      "_id": "$_id",
      "title": "$title",
      "delivered": "$delivered",
      "products":  { "$arrayToObject": "$zip" },
    }},
    {"$lookup": {
      "from": "orders",
      "let": {
        "product_id": "$_id",
        "delivered": "$delivered",
      },
      // Embedded pipeline to control how the join is matched
      "pipeline": [
        // join by two fields each side
        {"$match": 
          {"$expr":
            {"$and": [
              {"$eq": ["$product_id", "$$product_id"]}, 
              {"$eq": ["$delivered", "$$delivered"]}, 
            ]},
          },
        },
        { "$group": { 
          "_id": "$product_id",
          "count": { "$sum": 1 },
        }},
      ],
      as: "orderCount"
    }},
    { $addFields: { 
      "orders": {
        "$cond": { 
          "if": { "$size" : "$orderCount" },
          "then": { "$arrayElemAt": [ "$orderCount.count", 0 ] },
          "else": 0,
        },
      },
    }},
    { "$unset": "orderCount" },
  ];
  try {
    return await _mongodb.collection("boxes").aggregate(pipeline).toArray();
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


/**
 * collect the orders with products matched to the box
 */
export const getPickingData = async (query) => {
  const pipeline = [
    // match orders to query
    { "$match": query },
    { "$unset": [
      "_id"
    ]},
    {"$lookup": {
      "from": "boxes",
      "let": {
        "product_id": "$product_id",
        "delivered": "$delivered",
      },
      // Embedded pipeline to control how the join is matched
      "pipeline": [
        // join by two fields each side
        {"$match": 
          {"$expr":
            {"$and": [
              {"$eq": ["$shopify_product_id", "$$product_id"]}, 
              {"$eq": ["$delivered", "$$delivered"]}, 
            ]},
          },
        },
        { "$project": {
          "products": { "$concatArrays": [ "$addOnProducts", "$includedProducts" ] }
        }},
        { "$group": { 
          "_id": "$products.shopify_tag",
          "products": { "$addToSet": "$products.shopify_title" },
        }},
        { "$project": {
          "zip": {
            "$zip": {
              "inputs": [
                { "$arrayElemAt": [ "$products", 0 ] }, "$_id"
              ]
          }},
        }},
        { "$project": {
          "_id": null,
          "products":  { "$arrayToObject": "$zip" },
        }},
        { "$replaceRoot": { "newRoot": "$products" }},
        /* this gives an object of {"productName": "tag"} */
      ],
      as: "box"
    }},
    { "$project": { 
      "delivered": "$delivered",
      "products": { "$arrayElemAt": [ "$box", 0 ] },
      "including": "$including", // pulls from order.including, perhaps should just use the box?
      "removed": "$removed",
      "addons": "$addons",
      "swaps": "$swaps",
      "title": "$product_title",
      "product_id": "$product_id",
      }
    },
  ];

  try {
    return await _mongodb.collection("orders").aggregate(pipeline).toArray();
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

export const buildPickingSheet = (data, worksheet) => {

  worksheet.columns = [
    { header: 'Item', key: 'item', width: 44 },
    { header: 'Including', key: 'including', width: 8 },
    { header: 'Addons', key: 'addons', width: 8 },
    { header: 'Swaps', key: 'swaps', width: 8 },
    { header: 'Custom', key: 'custom', width: 8 },
    { header: 'Total', key: 'total', width: 8 },
  ];

  for (const [tag, items] of Object.entries(data)) {
    for (const [product, counts] of Object.entries(items)) {
      const row = worksheet.addRow(
        {
          'item': product,
          'including': counts.including,
          'addons': counts.addons,
          'swaps': counts.swaps,
          'custom': counts.custom,
          'total': counts.total
        }
      );
      [1, 2, 3, 4, 5].forEach(num => row.getCell(num).font = { name: 'Arial' });
      row.getCell(6).font = { bold: true, name: 'Arial' };
    };
    worksheet.addRow(null);
  };

  // format sheet
  worksheet.getRow(1).font = {bold: true, name: 'Arial'};

  // align center
  for (let i=2; i<=worksheet.actualColumnCount; i++) {
    worksheet.getColumn(i).alignment = {horizontal: 'center'}
  }

  const start = {
    top: {style: 'thin'},
    left: {style: 'thin'},
    bottom: {style: 'thin'},
  };
  const mid = {...start, right: {style: 'none'}};
  const all = {...start, right: {style: 'thin'}};

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    worksheet.getCell(`A${rowNumber}`).border = mid;
    ['B', 'C', 'D', 'E'].forEach((v) => {
      worksheet.getCell(`${v}${rowNumber}`).border = mid;
    });
    worksheet.getCell(`F${rowNumber}`).border = all;
  });

  return worksheet;
};

export const buildPackingSheet = (data, worksheet) => {
  const columns = [];
  const rows = [];

  for (const [title, box] of Object.entries(data.boxes)) {
    const key = title.toLowerCase().replace(/ /g, '-');
    const emptykey = `${key}-empty`;
    // title header
    columns.push(
      { header: title, key: key, width: 30 }
    );
    // count header
    columns.push(
      { header: box.count, key: emptykey, width: 4 }
    );
    for (const idx in box.products) {
      const row = (idx in rows) ? rows[idx] : {};
      row[key] = box.products[idx];
      row[emptykey] = null;
      rows[idx] = row;
    };
  };
  worksheet.columns = columns;
  
  // some meta info - line space first
  rows.push({ [columns[0].key]: null, [columns[1].key]: null})
  rows.push({
    [columns[0].key]: "Custom Boxes",
    [columns[1].key]: data["custom-boxes"]
    })
  rows.push({
    [columns[0].key]: "Total Boxes",
    [columns[1].key]: data["total-boxes"]
    })

  rows.forEach(el => {
    const row = worksheet.addRow({...el});
    row.font = { name: 'Arial' };
  });

  worksheet.getRow(1).font = {bold: true, name: 'Arial'};

  // bold the metadata
  worksheet.getRow(rows.length).font = {bold: true, name: 'Arial'};
  worksheet.getRow(rows.length + 1).font = {bold: true, name: 'Arial'};

  // align center
  for (let i=1; i<=worksheet.actualColumnCount-2; i++) {
    if (i%2 === 0) worksheet.getColumn(i).alignment = {horizontal: 'center'}
  }

  const insideColumns = Array(); // gets the column alphabetical character
  for (var i = 1; i < columns.length; i++) {
    insideColumns.push(String.fromCharCode(i + 64));
  }
  const lastColumn = String.fromCharCode(columns.length + 64);

  const start = {
    top: {style: 'thin'},
    left: {style: 'thin'},
    bottom: {style: 'thin'},
  };
  const mid = {...start, right: {style: 'none'}};
  const all = {...start, right: {style: 'thin'}};

  // loop through all of the rows and set the outline style.
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < rows.length) {
      insideColumns.forEach((char) => {
        worksheet.getCell(`${char}${rowNumber}`).border = mid;
      });
      worksheet.getCell(`${lastColumn}${rowNumber}`).border = all;
    } else {
      // except for last two rows that hold the meta info - two colums only
      worksheet.getCell(`A${rowNumber}`).border = mid;
      worksheet.getCell(`B${rowNumber}`).border = all;
    };
  });

  return worksheet;
};
