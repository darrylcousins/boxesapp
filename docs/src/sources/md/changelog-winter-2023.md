# Change Log - Winter 2023

Since the release of the integration with [Recharge][recharge] at the end of
last [winter][changelog2023] there has been a number of problems that I hadn't
addressed.

## Processes

[BoxesApp][boxesapp] integration with [Recharge][recharge] was failing because
it was possible in some cases for the customer to make multiple changes that
ended up with overlapping and inconsistent data. To solve this problem I have
created additional processes to handle the asynchronous handling of **api**
calls and **webhooks**.

So now [BoxesApp][boxesapp] has several `worker` processes running. These
workers are built upon [BullMQ][bullmq] that uses a [Redis][redis] database to
queue events.

To control these processes [BoxesApp][boxesapp] now utilises the service of a
[process manager][pm2] to track and log their activity. A future project will
be to add a processes tab to the shop administrator suite.

## "Orphaned" Subscriptions

Orphaned subscriptions show up as incorrect billing to the
customers.

Because [BoxesApp][boxesapp] was failing to synchronise [Recharge][recharge]
subscriptions in rare cases an orphaned product was charged to the customer
but did not appear in the box.

Aside from the changes that (fingers crossed) will prevent this occurring we
now have a nightly [script][cron] that locates orphaned subscriptions and
emails the shop administrator a report.

## Customer Subscription Interface

It has been a bit of a struggle eliminating problems here; problems that created *orphaned*
subscriptions. There are many lists and subscriptions to manage and as described
above, situations arose where the data was inconsistent. But this set of updates
intend to eliminate these problems.

When adding items to a box (both for customer interface and the administrator's
*edit order* interface) they can now select multiple products.

When cancelling a subscription the customer is now given a list of reasons that
can be created, edited, and sorted by the shop administrator.

## Logging

Logging has been extended, greatly. Many more logging calls have been created to track
what [BoxesApp][boxesapp] is doing, an abridged subscription log list is also now provided to
the customer in their user interface.

Because I'm now logging so much data, the administrator's interface includes more
filtering and pagination.

## Administrator's Subscriber Interface

Previously this accessed customers with an api call to [Recharge][recharge],
now I'm storing minimal customer data on the local [database][mongo]. A nightly
[script][cron] keeps the local database up to date and emails a report to the administrator.

The administrator's interface now includes pagination and a means to search
customers on id and name. Out of sync customers can be updated individually
within the interface (e.g. if data has changed since nightly update).

## Product Images

Previously I was relying on image urls stored on [Recharge][recharge] but this
wasn't always reliable. So now [BoxesApp][boxesapp] maintains it's own folder
of product images. These are updated when products are added to boxes. A
default image is provided if a product image is not found.

[BoxesApp][boxesapp] uses these images in html emails and in the customer and
administrator interfaces. Now everywhere a product title appears, an image is
alongside.

## Mail

Mail is now being run as separate process via [BullMQ][bullmq].

Mail structure and templating has been fully reworked in view of a future
feature whereby the shop administrator will be able to edit text that is used
in the emails. Some existing text has been changed for copy provided.

Site logos have been added (environment settings) to email html and I've changed how images are
included (some mail clients do not accept `background-image`).

I've added some environment settings to manage the subject line and blind copy
recipients.


[boxesapp]: https://boxesapp.nz/
[recharge]: https://rechargepayments.com/
[shopify]: https://www.shopify.com/
[changelog2023]: https://boxesapp.com/changelog-winter-2023
[bullmq]: https://bullmq.com
[redis]: https://redis.com
[pm2]: https://pm2.com
[mongo]: https://mongodb.com
[cron]: https://www.man7.org/linux/man-pages/man8/cron.8.html

