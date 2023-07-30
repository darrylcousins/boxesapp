# Change Log - Winter 2023

Since the release of the integration with [Recharge][recharge] at the end of
last [winter][changelog2023] there has been a number of problems that I hadn't
addressed (it's a hobby, yes?).

The changes I'll try to describe here cost around 300 hours of coding. I had
two weeks that I could devote all my time (i.e. 70-80 hours) and then 3 weeks
that I could manage 4/5 hours a day and the full weekends.

## Processes

[BoxesApp][boxesapp] integration with [Recharge][recharge] was failing because
the user interface that allowed the editing of a subscribed box did not always
keep the related subscriptions synchronised. To solve this problem I have
created additional processes to handle the asynchronous process of **api** calls and
**webhooks**.

So now [BoxesApp][boxesapp] has several `worker` processes running. These
workers are built upon [BullMQ][bullmq] that uses a [Redis][redis] database to
queue events. Additionally [BoxesApp][boxesapp] now utilises the service of a
[process manager][pm2] to track and log these processes.

## Customer Subscription Interface

Bit of a struggle eliminating problems here, problems that created *orphaned*
subscriptions. There are many lists and subscriptions to manage. But it seems
that we have it in hand.

Added multiple select when adding items to a box (same too for administrator's
*edit order* interface).

## "Orphaned" Subscriptions

Because [BoxesApp][boxesapp] was failing to synchronise [Recharge][recharge]
subscriptions in all cases then an orphaned product was charged to the customer
but did not appear in the box.

Aside from the changes that (fingers crossed) will prevent this occurring we
now have a nightly [script][cron] that locates orphaned subscriptions and
emails administrator a report.

## Logging

Logging has been extended, greatly. Many more logging calls have been created to track
what [BoxesApp][boxesapp] is doing, an abridged list is also now provided to
the customer in their user interface.

Because I'm now logging so much data the administrator's interface includes more
filtering and pagination.

## Product Images

Previously I was relying on image urls stored on [Recharge][recharge] but this
wasn't always reliable. So now [BoxesApp][boxesapp] maintains it's own folder
of product images. These are updated when products are added to boxes. A
default image is provided if a product image is not found.

[BoxesApp][boxesapp] uses these images in html emails and the user's *edit subscription*
interface, they're now in the administrator's *edit box* interface, because;
why not?

## Administrator's Subscriber Interface

Previously this accessed customers with an api call to [Recharge][recharge],
now I'm storing minimal customer data on the local [database][mongo]. A nightly
[script][cron] keeps the local database up to date and emails a report to the administrator.

The administrator's interface now includes pagination and a means to search
customers on id and name. Out of sync customers can be updated (e.g. data has
changed since nightly upodate).

## Mail

Added some environment settings to manage the subject line and blind copy
recepients. Mail is now being run as separate process via [BullMQ][bullmq].


[boxesapp]: https://boxesapp.nz/
[recharge]: https://rechargepayments.com/
[shopify]: https://www.shopify.com/
[changelog2023]: https://boxesapp.com/changelog-winter-2023
[bullmq]: https://bullmq.com
[redis]: https://redis.com
[pm2]: https://pm2.com
[mongo]: https://mongodb.com
[cron]: https://www.man7.org/linux/man-pages/man8/cron.8.html

