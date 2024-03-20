# Bug report for Recharge

## Preamble

[BoxesApp](https://boxesapp.nz "BoxesApp Documentation") provides
administration and client interfaces for selling items grouped together in a
box. As detailed below it was first and foremost developed to sell and deliver
boxes of organic vegetables.

For the customer it provides for:

* exclusions and substitutes in boxes
* the addition of extra items
* selection of day of delivery
* pausing and rescheduling of delivery
* easy weekly editing of products in boxes

And for the shop administrator:

* creation and editing of the weekly boxes
* duplication of boxes to the following week
* customer subscripion management (as for customer)
* order (boxes via shopify orders)  management, fix orders, changed delivery date, address etc
* compilation of picking and packing lists from the orders (csv/xls)
* data format for printing labels for the boxes (csv/xls)
* searchable logs

## The guts

I have noted that the webhooks `order/created` and `order/processed` have
muddled the line item properties. I initially thought that my app was mutating
the properties but I've been unable to find any source. I only noted the
problem because I was using the `order/processed` webhook to update a single
property but therefore saving to the subscription the muddled properties. I
have resolved the problem for myself by instead using the `charge/created`
webhook to update the delivery date.

As you can see below there is no aspect of my code that can have any bearing on
the contents of the `order/created` and `order/processed` webhooks.

