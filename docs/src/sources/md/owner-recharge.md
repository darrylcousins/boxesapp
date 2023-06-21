# Store Owner - Recharge

## Purchase options

Purchase options in Recharge must be in `weeks` and **not** `days`. The reason
for this is that by using weeks we can define a specific weekday to make the charge
(i.e. when the shopify order is created). The default (not configurable) is
that the charge is made 3 days prior to the delivery day and to advise the
customer a further 3 days before that.

**Every** item with product type of `Container Box` or `Box Produce` must have
matching available options. I.e. if boxes have both weekly (``every 1 week``) and fornightly
(``every 2 weeks``) then **every** `Box Produce` product must also share those options.

## Tokens

`RECHARGE_ACCESS_TOKEN` and `RECHARGE_CLIENT_SECRET` - From recharge - the store owner will need to grant
access to the tokens or supply them from the recharge admin.

## Installing Recharge

Had some grief 'auto' installing the widget, worked fine on one theme and
didn't on another. Ended up installing liquid script manually ([instructions](https://support.rechargepayments.com/hc/en-us/articles/360008830653-Installing-the-Recharge-Checkout-on-Shopify-integration-manually)). Some clicking
around the recharge admin managed to sort through the "confirm installation"
procedure.

## Customer Portal

```
Recharge admin -> Storefront -> Customer Portal
```

The following **Subscription Details** settings must be **off** to work with the [Boxes
App](http://boxesapp.nz). The numbered points below refer briefly to how the Boxes App *could*
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

![Customer Portal](CustomerPortal.png)

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

![Translations](Translations.png)

## Customer Notifications

Because the Boxes App sends out an email on *subscription creation* and on
*charge upcoming* (3 days prior to charge date) then it is recommended that these 2 email
notifications be disabled.

It could also be argued that because Shopify sends out an *order confirmed*
email when the charge is created the Recharge notification *recurring charge
confirmation* may also be disabled.

The *subscription cancellation* notification should however be enabled, because
Boxes App handles the cancellation of subscriptions a single email is sent for
the container box only and not the other included items. Note: Currently it
seems that this email is not sent when cancelling a single box subscription
through the api. Awaiting confirmation from Recharge about this before creating
an email from Boxes App confirming the cancellation.

![CustomerNotifications](CustomerNotifications.png)

## Owner Notifications

The *cancellation alert* notification should be enabled along with these other settings.

![StoreOwnerNotifications](StoreOwnerNotifications.png)

## Customer Portal

The Boxes App must take care of skipping charges and cancelling subscriptions.
This is because Recharge does not know about the products in a box.

At `Storefront -> Customer Portal` additional html can be added to the header
and footer. The following could be suggested adding to the header:


```html
<section class="rct_content"
     style="background-color:khaki; padding: 10px;border:1px;margin-bottom:1em">
  <p>
    <img 
      style="width:50px;float:left;margin-right:1em;"
      src="https://boxesapp.nz/assets/boxes.svg"
    />
    To skip an order, or cancel a subscription, or change the products in your
    box subscription please return to your
    <a href="/account" 
       style="font-weight: bold;color:#333">
      account
    </a>
    page and select the link to
    <i style="font-weight: bold">Manage Subscribed Boxes</i>.
  </p>
</section>
``` 

<img src="CustomerPortalHeader.png" width="660" />

