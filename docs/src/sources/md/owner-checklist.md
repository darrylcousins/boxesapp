# Store Owner - Checklist

## Recharge

Installing Recharge is detailed [here](owner-recharge).

## Box Containers

* Must have product type: *Container Box*.
* Must have variants matching days of week to be delivered. (An exception described in detail [here](/owner)).
* Must be added to Recharge if to be a subscription box.
* Must have Recharge purchase options in weeks.
* Should have tracked inventory

## Box Produce

The following is for all products intended to be added to boxes both as an
*included* product and an *addon* product. The store administrator should do
this for every product subsequently added.

* Must have product type: *Box Produce*.
* Must be tagged with a tag matching the list in Boxes App -> General Settings.
* Must have **no** variants/options.
* **Must** be added to Recharge if to be included in a subscription box. (No mechanism exists at this point to prevent this so it is the responsibility of the store owner to do so.)
* Must have Recharge purchase options in weeks and match the container purchase options.
* Should have tracked inventory - the Boxes App updates the inventory using the Shopify API when an order is made.

## Theme edits

Two edits are required to the theme to install the Boxes App.

Firstly we need to load the `boxesapp` files in `layout/theme.liquid`. I've
been placing it below other javascript script tags.

```django
  {% if request.page_type == 'product' %}
    {{ 'boxesapp.css' | asset_url | stylesheet_tag }}
    {{ 'boxesapp.js' | asset_url | script_tag }}
  {% endif %}
```

Secondly in the product template. With the theme I've been playing with I look
for the `product_form` snippet and replace with the following. This means that
any product **not** a `Container Box` should still render the correct form. The
`Recharge` widget only renders as part of the form so it is effectively
disabled for `Container Boxes` but should still render it's widget for any
other subscription products in the shop.

```django
  {% if product.type == 'Container Box' %}
    <script type="application/json" id="cart-json">
      {{ cart | json }}
    </script>
    <script type="application/json" id="box-settings-json">
    </script>
    <script type="application/json" id="box-rules-json">
    </script>

    <div style="text-align: center; font-weight: 700">
        <p id="product-price">{{ current_variant.price | money }}</p>
    </div>
    <div id="app">
      <div class="progress-bar mt2">
        <span class="bar">
          <span class="progress" />
        </span>
      </div>
    </div>
  {% else %}
    {% include 'product-form' %}
  {% endif %}
```

It may be that the store owner will not want *Box Produce* items to be added
individually to a cart nor to be subscribed for individually. To disable the
product form the following 3 lines can replace the above.

```django
  {% if product.type == 'Container Box' %}
    ...
  {% elif product.type != 'Box Produce' %}
    {% include 'product-form' %}
  {% endif %}
```


