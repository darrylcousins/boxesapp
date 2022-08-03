import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import subscriptionTemplate from "../../../../mail/templates/subscription.js";

/**
 * Simple template for node script
 */

const subscriptions = [{
  "box": {
    "_id": "62d74d8c0245d0a37900ddf3",
    "delivered": "Sat Jul 30 2022",
    "shopify_title": "The Small Vege Box",
    "shopify_handle": "the-small-vege-box",
    "shopify_product_id": 6163982876822,
    "active": true,
    "image": "https://cdn.shopify.com/s/files/1/0453/4475/1766/products/SmallVegeBox02_large.jpg?v=1613462160_small",
    "shopify_price": "25.00"
  },
  "properties": {
    "Delivery Date": "Sat Jul 30 2022",
    "Including": "Carrots 1kg,Cauliflower,Cavolo Nero Shoots,Celeriac,Onions Brown 4x,Pak Choi,Yams 500g",
    "Add on Items": "Beetroot 1kg,Microgreens (2)",
    "Swapped Items": "Cabbage Green",
    "Removed Items": "Surprise Item",
    "Likes": "Beetroot 1kg,Cabbage Green,Microgreens",
    "Dislikes": "Surprise Item"
  },
  "messages": [],
  "address": {
    "address1": "11 Taumutu Road",
    "address2": null,
    "city": "Southbridge",
    "company": null,
    "country_code": "NZ",
    "first_name": "Darryl",
    "last_name": "Cousins",
    "phone": "027 524 7293",
    "province": "Canterbury",
    "zip": "7602",
    "name": "Darryl Cousins"
  },
  "attributes": {
    "nextChargeDate": "Wed Jul 27 2022",
    "hasNextBox": true,
    "variant": "Saturday",
    "frequency": "Delivery every 1 week",
    "images": {
      "The Small Vege Box": "https://cdn.shopify.com/s/files/1/0453/4475/1766/products/SmallVegeBox02_large.jpg?v=1613462160_small",
      "Microgreens": "https://cdn.shopify.com/s/files/1/0453/4475/1766/products/StreamsideMicrogreens_e732481b-fed7-4db6-ba71-793c2378940f_large.jpg?v=1613543024_small",
      "Beetroot 1kg": "https://cdn.shopify.com/s/files/1/0453/4475/1766/products/IMG_2685_6e179a83-d588-482f-81dd-f652e01c82f2.jpg?v=1653978919"
     },
    "subscription_id": 263825606,
    "charge_id": 619857522,
    "address_id": 99231541,
    "customer": {
      "id": 84185810,
      "email": "cousinsd@proton.me",
      "external_customer_id": {
        "ecommerce": "3895947395222"
      },
      "hash": "78927a76eb2779c61bbc178edffd72"
    },
    "lastOrder": {
      "current_total_price": "40.00",
      "order_number": 1142,
      "delivered": "Sat Jul 23 2022"
    },
    "totalPrice": "40.00",
  },
  "updates": [],
  "messages": [
    "Item Cabbage Green removed because unavailable",
    "Some other message",
    "And another message to be included",
  ],
  "includes": [
    {
      "title": "The Small Vege Box",
      "shopify_product_id": 6163982876822,
      "subscription_id": 263825606,
      "quantity": 1,
      "price": "25.00",
      "total_price": "25.00",
    },
    {
      "title": "Beetroot 1kg",
      "shopify_product_id": 6621185769622,
      "subscription_id": 264738394,
      "quantity": 1,
      "price": "5.00",
      "total_price": "5.00",
    },
    {
      "title": "Microgreens",
      "shopify_product_id": 6166843261078,
      "subscription_id": 264747970,
      "quantity": 2,
      "price": "5.00",
      "total_price": "10.00",
    }
  ],
  "removed": []
}]


/*
 *   Compile an mjml string
 */
export default async (req, res, next) => {

  const engine = new Liquid();
  const options = {};
  
  try {
    engine
      .parseAndRender(subscriptionTemplate, { subscriptions, env: process.env })
      .then(sections => {
        const htmlOutput = mjml2html(`
    <mjml>
      <mj-body>
        <mj-section padding-bottom="0px">
          <mj-column>
            <mj-text align="center" font-size="20px" font-style="bold">
            Charge upcoming
            </mj-text>
          </mj-column>
        </mj-section>
    ${sections}
  </mj-body>
</mjml>
`);
        res.set('Content-Type', 'text/html');
        res.send(Buffer.from(htmlOutput.html));
      });

  } catch(err) {
    res.status(400).json({ error: err.toString() });
  };
};
