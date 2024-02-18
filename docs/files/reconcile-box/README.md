Reconcile Box
=============

Lots of work in figuring how to reconcile the box lists when updating to a new box.

Files included in this folder:

first.js: This was my first attempt which sat in
lib/recharge/reconcile-charge-group.js and was used all over the show, wherever
getChargeGroup was called.

second.js: Second attempt that developed when looking for a simpler way of getting
reconciled lists, e.g. for editing an order or reconciling a box in the change
box use interface.

reconcile-box.svg: the final algorithm which is in api/reconcile-box.js
