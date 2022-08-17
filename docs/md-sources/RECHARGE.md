# Recharge

## Purchase options

Purchase options in Recharge must be in `weeks` and **not** `days`. The reason
for this is that by using weeks we can define a specific weekday to make the charge
(i.e. when the shopify order is created). The default (not configurabel) is the charge 3 days
prior to the delivery day and to advise the customer a further 3 days before
that.

**Every** item with product type of `Container Box` or `Box Produce` must have
matching available options. I.e. if boxes have both weekly (``every 1 week``) and fornightly
(``every 2 weeks``) then **every** `Box Produce` product must also share those options.

## Tokens

`RECHARGE_ACCESS_TOKEN` - From recharge - the store owner will need to grant
access to the tokens or supply them from the recharge admin
`RECHARGE_CLIENT_SECRET` - From recharge, as above

## Installing Recharge

Had some grief 'auto' installing the widget. Ended up installing liquid script
manually. Some clicking around the recharge admin managed to sort through the
"confirm installation" procedure.

## Settings

Recharge admin -> Storefront -> Customer Portal

These **Subscription Details** settings must be **off** to work with the [Boxes App](http://boxesapp.nz). The notes refer briefly to how the boxesapp "could" be enhanced to allow these settings.

1. *Edit upcoming order date*:
  Could allow this by marking a change in `next_charge_schedule_at` and update properties and all subscriptions.
2. *Edit upcoming quantity*:
  Also could do this, if an extra item then update box properties.
3. *Add products to subscription*:
  Again doable but if more than one box would have to choose a default.
4. *Change variants*:
  Definitely doable, this relates to a change of delivery date and `order_day_of_week`
5. *Swap product*:
  Also doable, again the difficulties will be when more than one `Container Box` is in the charge.
