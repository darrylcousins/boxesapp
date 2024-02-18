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
* **Must** be added to Recharge if to be included in a subscription box.
* Must have Recharge purchase options in weeks and match the container purchase options.
* Should have tracked inventory - the Boxes App updates the inventory using the Shopify API when an order is made.

## Theme edits

Several edits are required to the theme to install the Boxes App.

### Layout

Firstly we need to load the `boxesapp` files in `layout/theme.liquid`. I've
been placing it below other javascript script tags.

```django
  {% if request.page_type == 'product' %}
    {{ 'boxesapp.css' | asset_url | stylesheet_tag }}
    {{ 'boxesapp.js' | asset_url | script_tag }}
  {% endif %}
```

### Product template

Often named `main-product.liquid`, dependent on theme.

Secondly in the product template. With the theme I've been playing with I look
for the `product_form` snippet and replace with the following. This means that
any product **not** a `Container Box` should still render the correct form. The
`Recharge` widget only renders as part of the form so it is effectively
disabled for `Container Boxes` but should still render it's widget for any
other subscription products in the shop.

----

**NB** I've done this now with a few themes and it can be a bit tricky to get rid of
the old form dependent on the product-type. Some themes use lots of javascript
to load variants and subscriptions and present the form itself.

----

```django
  {% if product.type == 'Container Box' %}
    <script type="application/json" data-product-json id="product-json">
      {{ product | json }}
    </script>
    <script type="application/json" id="cart-json">
      {{ cart | json }}
    </script>
    <script type="application/json" id="box-settings-json">
    </script>
    <script type="application/json" id="box-rules-json">
    </script>

   <div id="boxesapp-product-title" style="text-align: right; font-weight: 700">
      <h2></h2>
    </div>
    <div style="text-align: center; font-weight: 700">
        <p id="boxesapp-product-price">{{ current_variant.price | money }}</p>
    </div>
    <div id="boxesapp">
      <div class="progress-bar mt2">
        <span class="bar">
          <span class="progress" />
        </span>
      </div>
    </div>
  {% elif product.type != 'Box Produce' %}
    {% include 'product-form' %}
  {% endif %}
```

It may be that the store owner will want *Box Produce* items to be added
individually to a cart or to be subscribed for individually. **Not recommended** in my opinion.

```django
  {% if product.type == 'Container Box' %}
    ...
  {% elif product.type != 'Box Produce' %}
    {% include 'product-form' %}
  {% endif %}
```

### Cart template

Often named `main-cart-items.liquid`, dependent on theme.

Something like this in the cart template will format the box properties nicely:

```django
{%- if item.product.type == 'Container Box' or item.product_type == 'Box Produce' -%}
  {%- for property in item.properties -%}
    <div class="product-option" style="display: table; table-layout: fixed; width:100%">
      <div style="display: table-cell">{{ property.first }}:</div>
      <div style="display: table-cell">
        {%- assign proplist = property.last | split:"," -%}
        {%- if proplist.size == 1 -%}
          <div style="display: block">
            {{ proplist.first }}
          </div>
        {%- else -%}
          {%- for prop in proplist -%}
            <div style="display: block">
              &middot; {{ prop }}
            </div>
          {%- endfor -%}
        {%- endif -%}
      </div>
    </div>
  {%- endfor -%}
{%- else -%}
  ... the theme item properties loop
{%- endif -%}
  <p class="product-option">{{ item.selling_plan_allocation.selling_plan.name }}</p>
```

A link should be provided to send that customer back to further make changes to
their box, this should be placed directly after the above properties.

```django
{%- if item.product.type == 'Container Box' -%}
  <p class="cart__remove">
    <a href="{{ item.url }}"
      class="button button--secondary"
      style="width: 100%"
      aria-label="Edit box" data-cart-item-edit>
        Edit box
    </a>
  </p>
{%- endif -%}
```

Editing quantities of the box and it's included products needs to be disabled
by wrapping the theme cart quantity section in:

```django
{%  if item.product.type != "Container Box" and item.product.type != "Box Produce" %}
 ... quantity edit form
{% endif %}
```

Finally, because boxesapp still doesn't support ordering more than one box at a
time then a button at the top of the cart page may look something like this.

---

The customer can also go directly to another box and update the cart from
there, however I feel the **empty cart** button is a friendly addition.

---

```django
{% if cart.items.size > 0 %}
  <div style="border: 1px solid silver; padding:0 1em;margin-bottom: 1em;">
    <h4 class="cart-header__title">Can I order more than one box?</h4>
    <p class="text">
      You sure can, you just need to place the orders separately
    </p>
    <p class="text" style="text-align:right">
      <a href="/cart/clear" class="button button--secondary">Empty cart</a>
    </p>
  </div>
{% endif %}
```

### Account template

Often named `main-account.liquid`, dependent on theme.

Somewhere on the account template a link is required to the boxesapp customer portal:

```django
  <p class="text">
    <a href="tools/boxes/customer-portal?cid={{ customer.id }}"
       style="display: inline-flex; text-decoration: none; margin-top: 1em;"
       class="button button--secondary">
      Edit/Pause Subscribed Boxes
    </a>
  </p>
```


