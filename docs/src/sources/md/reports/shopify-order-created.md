### Order Created

[BoxesApp](boxesapp) subscribes to a [Shopify](shopify) `order/created` webhook
that is received when a new order is created on the shopify site. The order is processed and stored in a local orders table that is used to generate *picking and packing lists* and an *order* spreadsheet that is used to print packing labels.

[BoxesApp](boxesapp) subscribes to a [Recharge](recharge) `charge/created`
webhook that is received when a charge is created by [Recharge](recharge). By
checking the status, and if `success` then boxes will process it as a newly
created subscription. In which case the app adds the property
`box_subscription_id` that is used to group the subscription into **boxes**.

It will then also set up the `order_day_week` subscription attribute on all the
grouped subscriptions so that every subscription has charge date 3 daysprior to
the *delivery date*. Then it also updates the property `Delivery Date` to
reflect the next scheduled delivery date of the box subscription.

Finally an email is sent to the customer with the details of the box subscription.

[shopify]: https://shopify.com
[recharge]: https://rechargepayments.com
[boxesapp]: https://boxesapp.nz

