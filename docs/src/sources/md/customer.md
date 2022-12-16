# Customer Documentation

## Ordering a Box

On the product page for the container box BoxesApp presents a user interface
for the customer with which they can select the day and date of delivery, a
subscription oprtion, and edit the items contained in the box. They can swap
out items for another that they prefer, add in extra items, and change the
quantity of each included item.

When the box is added to the cart the selected items are included and the total
price calculated. At the cart the customer is unable to change the quantities
of items but can return to further edit the box by clicking the `EDIT BOX`
button.

<video class="w-100" controls poster="ClientOrderBoxWidget.png">
  <source src="ClientOrderBoxWidget.mov" type="video/mp4">
Your browser does not support the video tag.
</video>

## Subscription Emails

When the customer selects to subscribe to the box they will receive 2 emails.

1. From Shopify detailing the current order.
2. From BoxesApp detailing the box and items in the box.

A further email may also be sent from Recharge to the customer if nominated to
do so in the Recharge settings by the store owner.

## Editing a Subscribed Box

In between orders the customer may edit the items in their box. This will be
dependent on the products included in the upcoming box. As can be seen below a
clear indication is given for the changes necessary to match the upcoming box.
The app will do this automatically when the charge upcoming email is sent,
prior to that the customer will need to confirm the update by clicking the
`Continue` button.

A charge is processed and a new order is created by Recharge 3 days prior to
the scheduled delivery date, after which time the box cannot be edited. Three
days prior to the order being created a `charge upcoming` email is sent to the
customer by Boxes, at this time the necessary changes are automatically made to
the customers box (unavailable extras removed etc) in the same manner as shown
below. Between the charge upcoming and the charge processed (i.e. order
created) the customer has the opportunity to make changes to their box.

<div class="alert items-center flex ba b--black br2 ph3 pv2 mb3 black-80" 
  style="background-color: sandybrown" role="alert">
<div class="f1 w-10 tc"><span class="v-mid">&#9888;</span></div>
<p class="lh-copy w-90 pt2">
Update required, the customer can also pause/resume and cancel the box subscription from this interface.  
</p>
</div>

<video class="w-100" controls poster="ClientSubscriptionBoxWidget.png">
  <source src="ClientSubscriptionBoxWidget.mov" type="video/mp4">
Your browser does not support the video tag.
</video>

