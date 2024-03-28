# Change Log - Early 2024

After last winter's chunk of work, including changes to running system
processes, I was still left with some nagging problems.

The most pressing of which was the way updates to a box (pause, reschedule,
edit products, and change box) became tedious due the way I was running
background processes and not presenting that well to the user of the
subscription interface (whether administrator or subscriber).

So at new year 2004 I started working again on boxesapp. This document is being
written early March 2004.

I have a part-time paying job, harvesting vegetables 3-6 hours a day. I love my
job. So my coding hours run at, on average 3 hours a day and 10-15 on weekends.
I get somewhat obsessive when working on a project like this so I can
confidently say that the past 8 weeks I have been working ~25 hours a week of
boxesapp. What was something of a hobby project has increasingly felt like
work.

So then, the change log:

## Box Edits

When a box is edited/paused/rescheduled/changed we need to wait for all updates
to have been completed at Recharge. This can take some time because of the
number of calls and webhooks that need to be processed. Initially an algorithm
attempted to wait for updates to complete and simply show the user a loading
bar and ask them to be patient. This ended up with stale entries in the
`updates_pending` table and (to my mind) was unsatisfactory. Firstly because
the original code wasn't quite getting it right all the time as to whether the
update was complete and secondly because there was very little feedback to the
user.

The new work is proving far more successful in tracking the completion of an
update and provides realtime feedback to the user by way of an open socket
receiving messages on the progress. Once all updates are completed (by way of
reading webhooks from Recharge) the `updates_pending` entry is removed and the
socket is closed, indicating to the front-end that the customer can continue.

## Reconcile Boxes

A lot of work has gone into improving the reconcile algorithm which reconciles
listed products in a subscription with the current box. It is used in multiple
places in the app, e.g. when a charge upcoming webhook is received, when the
subscriptions are loaded by admin or a customer, when a box is changed, and
also with orders. The script has to figure in particular how the extra
subscribed items match to the current box. For example an extra swap creates a
new subscribed product, if that swap is now in included products then it needs
to move lists, or if unavailable the extra product subscription needs to be
removed. Similar decisions need to be made for every product in each of the
four lists.

Aside from debugging existing problems with the original script, it has also
been improved in speed (there's quite a few loops that need to happen) and what
was around 450 lines of code is now around 150 lines.

## Subscriber Administration Interface

Some cosmetic changes here with links and buttons. Also, because I had test
subscriber with over a dozen subscriptions with a new charge for every day of
the week I found loading all charges (reconciling, verifying etc) took a wee
minute. So now the administrator can load a single charge at a time. This is
dependent on the locally stored list of charges being correctly synced (nightly
cronjob), but these can be resynced at will with a link alongside the
subscriber name.

## Add Box Subscription

The subscriber (and admin) can now add a new box subscription at will. This
uses a similar interface as for `change box` so that box, variant, and order
interval frequency can be selected. Included a checkbox that the customer
agrees that this is a subscription. Hoping for a subscription policy document
to link to.

## Subscriber Addresses

Each time a new subscription is created by way of a new order through Shopify
then Recharge will created a new address object for the customer. This had
lulled me into a sense of security because every `charge` has a unique
`address` object and therefore I could always be confident that there was only
one `box subscription` per charge.

However addresses can be merged and therefore different box
subscriptions can share the same `address_id`. Ooops, that broke BoxesApp. This
update handles that problem, and in fact the new **add box subscription**
feature adds the new subscription to an existing address object.

## Logs

* removed some unnecessary information to make the listing more readable
* added the ability to included more information if required in the listing
* added the selection of date ranges
* added a timestamp search to drill down to a particular moment in time (helps with debugging problems)
* searchable on customer and subscription ids.

## Errors

Vastly improved error handling and logging across the entire codebase. A good
start had been made in 2023 but that has been extended in this batch of work.
Additional tools added in 2023 allowed me to implement them whenever I was
working in any part of the application. This includes background activity, e.g.
webhooks, and also with handling errors arising in the api and forms.

## Emails

Improved and extended subscription information in all subscriber emails and
made improvements to the templating. Also added an additional email when an
order is processed (initially I had thought that the shopify confirmation email
was sufficient, but changed my mind).

## Verify Subscriptions

Extended verify subscription script. Added alerts to the shop administrator in
addition to the nightly email. The alerts list all the faulty subscriptions
found and prompts for action. Once action is taken individual customer accounts
can be re-verified. Stale `updates_pending` entries can now be deleted by the
shop administrator.

The verify script checks for:

* Date mismatches between charge date and delivery date
* Price mismatches for the box
* Orphans: Items in a charge that aren't listed as extras in the actual box.
* Quantity mismatches: Subscribed items with a quantity that do not match the actual box.

Aside from the nightly run of the script, all subscriptions are verified when
loaded into the front end. This was primarily to prevent editing of a broken
box. The fault is also logged and presented to the shop administrator.

## Freeze Boxes

Once the charge upcoming email goes out to subscribers the boxes are frozen and
no further edits are possible by the shop administrator. This solves a problem
I have noted where orders come in where the products no longer match the box.
This then messed with the picking list, I've coded a solution into the picking
list so it can handle the mismatched products and still come up with a correct
listing if need be.

## Orders

Now supporting multiple boxes on a single order, which can happen with
subscriptions. Because they share the same Shopify order number, I have used an
alphabetical suffix to keep them apart.

Fixed a problem with picking list where products weren't being correctly
grouped by tag. This was occurring (by elimination) because the shop
adminstrator had changed the box after an order had been placed - so the tag
wasn't found. Now I fetch the tag if it is missing. Also freezing boxes will
help here too.

### Stale carts creating late or out of date orders

Added a flag to orders that come in either 1. after cut-off time or 2. with a
delivery date in the past. This can happen when a customer has left a box in
their cart for a day or more and then comes back to it and checks out. At that
point the BoxesApp client can have no control over the item properties, i.e.
the delivery date or the product listings.

The flag creates an alert box for the shop administrator so they can take some
action, which may be to update the delivery date and communicate with the
customer, or similar. The administrator is provided with the means to remove
orders from this error listing, either whether correcting the problem first of
choosing to ignore it.

## Boxes

Just some small things here to make life for the shop administrator easier.
When duplicating boxes it now reloads into the date of the new boxes so the
administrator can go ahead an activate the boxes. When deleting boxes it
reloads into the previous date instead of an empty listing.

## Settings

Remove all colour settings (see notes about client). Added a default cutoff
hours setting that is used to set up default settings for boxes created for a
new weekday.

Change layout and functionality of administrators settings page.

## Client

Removed all colour settings, set up an example `boxesapp-custom.css` to allow
theme edits of colours.

Added id attributes to most nodes so they can be identified using the browser
inspector and css can be individually assigned in `boxesapp-custom.css`.

Added `data-setting` to all nodes that load from `translation` settings, so
using the browser inspector they can be easily identified, and changed in the
administration settings interface.

Did some more work on the collapsible items script to tighten up extra space that
would drift into the item.

I found that the Box Produce page collected boxes without taking into account
the box settings of cutoff time and order limits. To avoid complicated code I
had simply used an arbitary cutoff of 2 days. This has been rectified and now
accounts for the appropiate filters used on the Container Box page.

## Reports

A curious problem turned up when I started merging customer addresses so that I
have multiple boxes come in per order. That caused a bit of grief because prior
to that I could rely on only a single box per charge. I solved my problems but
then found that the [Recharge](recharge) `order/processed` webhook muddles the
line item properties, meaning that I was unable to use the
`box_subscription_id` property to confidently group the boxes. I approached
[Recharge](recharge) and they rightly queried what my app was doing. So I
started putting together reports that used exra logging (`env.DEBUG = 1`) to
capture everything that was going on. I now have [reports](/reports) for every
action that happens.

Creating these reports turned out to be a valuable exercise, I was able then to
analyze activity in the app in a detail that I had only until now gathered in
my small brain. It pointed to ways to eliminate api calls and other means of
opitimization.

Then I went on to automate the creation of reports which uses live data,
webhooks, emails, and requests. Finally a testing program on live data.

[shopify]: https://shopify.com
[recharge]: https://rechargepayments.com
[boxesapp]: https://boxesapp.nz
