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

## Customer Portal

```
Recharge admin -> Storefront -> Customer Portal
```

These **Subscription Details** settings must be **off** to work with the [Boxes
App](http://boxesapp.nz). The notes refer briefly to how the boxesapp "could"
be enhanced to allow these settings. It will be necessary however to add that
functionality to the `BoxesApp Customer Portal` so as to successfully keep
included products in sync with the box.

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

<img src="/assets/CustomerPortal.png" width="960" />

## Pausing and Cancelling Subscriptions

Because each subscribed box contains products that are registered with Recharge
as subscriptions in their own right we must disable the ability to cancel,
pause, or skip subscriptions in the Recharge customer portal. This can be done
in `Recharge Admin -> Storefront -> Customer Portal`. However there is an
obligation to provide these actions to the customer so it can be done in the
BoxesApp customer portal.

However, the `Cancel Subscription` link **cannot** be removed from the Recharge
customer portal. To get around that problem we can update the text shown to
provide information that points the customer to the BoxesApp customer portal
where pausing and cancelling can be done.

<img src="/assets/Translations.png" width="960" />

## Customer Notifications

Because the Boxes App sends out an email on *subscription creation* and on
*charge upcoming* (3 days prior to charge date) then these 2 email
notifications can be disabled.

The *subscription cancellation* notification should however be enabled, because
Boxes App handles the cancellation of subscriptions a single email is sent for
the container box only and not the other included items.

<img src="/assets/CustomerNotifications.png" width="660" />

## Owner Notifications

The *cancellation alert* notification should be enabled.

<img src="/assets/StoreOwnerNotifications.png" width="660" />
