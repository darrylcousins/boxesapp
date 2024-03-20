### Charge Upcoming

[BoxesApp](boxesapp) subscribes to a [Recharge](recharge) `charge/upcoming`
webhook that is received 3 days prior to the order being processed. At that
point the customer's box may need to be reconciled against the upcoming box:

* included items may have changed
* extra included items may not be available
* swaps and removed items may no longer work with the new box listing
* extra addons may already be included so should not be charged for

[BoxesApp](boxesapp) uses the `charge/upcoming` webhook to process the reconcilation.

So here briefly are the actions taken that can be followed along with the log
listing below.

The charge that is received in this example contains two **box subscriptions**,
both are small vege boxes. Only one of which requires changes after
reconciliation against the upcoming box delivery.

After the `charge/upcoming` webhook is received the app fetches the actual
subscription (this is **only** to collect the charge interval frequency that is
not included in the `line_items` of the charge).

> **Note**: Ask [Recharge](recharge) if they could include the interval frequency with
> the line items

Then the app fetches the most recent completed order for the customer from
[Recharge](recharge) and with the [Shopify](shopify) order number the app
fetches the most recent order from [Shopify](shopify). This data is gathered so
as to include all available information for the email to the customer.

> **Note**: So maybe [BoxesApp](boxesapp) should store this most recent historical
> data to save the api calls.

An `updates pending` entry is created in the local database to `lock` the box
subscription from changes until the updates are complete.

Then the reconcile algorithm is run to determine what, if any, updates need to
be made to the subscription to reconcile against the upcoming box. A list of
change messages for the customer is compiled for inclusion in the confirmation
email. These changes will include at the minimum a change to the listings for
the box, and possibly also deletions for extra items.

Webhooks are received from [Recharge](recharge) when the subscriptions are
updated and also when the charge is updated. Using these webhooks
[BoxesApp](boxesapp) is able to remove the `updates pending` entry once all
changes have been completed.

Finally an email is sent to the customer reminding them of the upcoming charge,
detailing the current contents of the box after reconciliation, notes newly
available items, and offers a link so they can make further changes during the
3 days before the charge is processed.

[shopify]: https://shopify.com
[recharge]: https://rechargepayments.com
[boxesapp]: https://boxesapp.nz
