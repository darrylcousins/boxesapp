# Thoughts

## Preamble

This could have been titled **TODOS** or **WishList** but instead it's more a
few thoughts about future projects.

## Web Sockets

First a few thoughts about sockets. In the [winter 2023](changelog-winter-2023)
I worked to solve the problem that I had created by simply using timeoouts to
prevent the customer from making edits to their subscription while other edits
were being updated. I had just looked at how long it generally took for
subscriptions and charges to be finalised, and delay activities accordingly;
it's not hard to see that this was a **fail**. This resulted in *orphaned*
subscriptions and charging errors.

So, I initially trialed setting up a websocket to monitor the updates in order
to receive notification when the subscription was finalised and could be
further edited. As this started getting a bit tricky I moved instead to using
polling from the browser using a timer and simply checking for updates every 30
seconds, making the customer patiently wait for the final reload. This fixed
the problem of *orphaned* subscriptions. I have a fair bit of socket code
written but the idea is on pause.

Still, not such a bad idea though. Jobs running through the queue can issue
events that could notify an open websocket and then message the browser. So
possible for sure. I'll talk about this a bit more in the next paragraph.

## Admin Process Monitor

As sysadmin I can use [pm2 monit][pm2] to follow logs of the server,
mail, image, and api workers. I also have a [bull-board][bull-board] instance
running so I can see what the queues are doing via a browser. I can imagine
combining these things to build a `processes` page for the admin.

So, sockets again. I figure I could store a `socket id` on the [database][mongo] and
build a transporter for [winston logger][winston] that will check for a socket,
and if one exists then emit the log to the browser with the socket connection.
Thereby providing *real time* logging in the browser. If I manage this then I
could revisit the socket idea I have for customer subscription editing.

Along with real time logging the process page could also have a `restart` for
the processes, and most certainly a `is running` indicator. Or even maybe a
`stats` indicator for number and frequency of api calls, etc.

## Shop Administrator Settings

This thought ties into thoughts about making the app a *proper*
[shopify][shopify] app. Presently it is not a *bona fide* app because
install/uninstall is not quite as it needs to be. This, and not doubt other
things, prevents it being available on the shopify app store.

To embed an app on a shopify store (as my understanding goes) developers are
obliged to use [Polaris][polaris] and [React][react]. I did try to follow this
route but eventually went the route of using a proxy url to imitate
*embedding*. Primarily because my front end code uses [crankjs][crankjs] that
produces a far smaller file size of compiled script and is (for me) far more
intuitive to code with.

So, currently, clicking on the [boxesapp](index) link in the shopify admin you
are only presented with a link to the *proxied* website.

But, my `.env` file has quietly grown in size as more variables are introduced
that are specific to the shop on which the app depends. So I think it is time
to expand the landing page in shopify admin (by requirement using
[Polaris][polaris] and [React][react]) to allow editing of these *environment
settings*.

## Email Templates

I was provided with copy from [Streamside][streamside] for the *subscription created*
email that is specific to their own shop. As they are the only user of the app
(Aug 2023) then that is not problem. But if [boxesapp](index) *were* to have
other clients then this copy will be needed to be customised. It is therefore
imperative that templates can be edited. No further thoughts here, write files,
use [database][mongo] or whatever.

## Client App On Store

A change of theme on [Streamside][streamside] cost me many, many hours of work
to fix the client app for the new theme (the dark background was a headache). A
settings module for the admin allows for the editing of fragments of text that
appear in the client app and for the colours of buttons etc. Even so, this was
not anything close enough to allow making the changing of the
[shopify](shopify) theme an easy task. My thinking now is ditch most of
settings (keeping only the text strings) and de-coupling the css for the client
app so that it can simply be edited in the store admin.

## Analytics

Maybe analyse cancel/edit/delete emails to look for patterns and customer behaviours.

[bullmq]: https://bullmq.com
[bull-board]: https://github.com/felixmosh/bull-board
[redis]: https://redis.com
[polaris]: https://polaris.shopify.com/
[react]: https://react.dev/
[streamside]: https://streamsideorganics.co.nz/
[winston]: https://github.com/winstonjs/winston
[pm2]: https://pm2.com
[crankjs]: https://crankjs.org/
[mongo]: https://mongodb.com
[shopify]: https://shopify.com
