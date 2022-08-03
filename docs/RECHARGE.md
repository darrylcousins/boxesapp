# Recharge purchase options

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
