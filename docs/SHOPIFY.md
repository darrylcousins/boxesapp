# Shopify

The boxes app requires a degree of conformity of the set up of products to work.

## Container Boxes

### Product Type

These are the root product of each box and must have the custom `Product Type`
of `Container Box`. This is so the client app can load the code to render the
box selection component. It is also used by the server backend when adding or
editing boxes.

### Collections

Best advice is to put the container boxes in their own `Collection` and to
structure the site so that only these are listed in visible catalogues.

### Variants/Options

An option name of `Weekday` must be added with values matching the days of week
intended to for delivery which results in variant titles matching 
`Thursday`, `Saturday` etc.

## Box Produce

### Product Type

These are the products that can be included both as a regular item or an add on
item and must have the custom `Product Type` of `Box Produce`. It is
used by the server backend when adding or editing products in boxes.

### Collections

Best advice is to make these products hidden within the site by not including
them in any collection that could be listed in a catalogue visible to the end
users.

### Variants/Options

**No** variant or options can be added to the products. Doing so may result in
unexpected results.

## Recharge purchase options

Purchase options in Recharge must be in **`weeks`** and **not** `days`. The
reason for this is that by using weeks we can define a specific weekday to make
the charge (i.e. when the shopify order is created). The default (not
configurable) is that the charge is processed - and the order created - 3 days
prior to the delivery day and to advise the customer a further 3 days before
that. The email to the customer details the changes made to the box between deliveries:

* items included or excluded for the upcoming delivery
* addon items unavailable and their subscription updated
* subscriber then has 3 days to update their box prior to the order being created

**Every** item with product type of `Container Box` or `Box Produce` must have
matching available options. I.e. if boxes have both weekly (`every 1 week`) and fornightly
(`every 2 weeks`) then **every** `Box Produce` product must also share those options.

# Theme edits

Two edits are required to the theme to install the app.

Firstly we need to load the `boxesapp` files in `layout/theme.liquid`.

```liquid
  {% comment %}
    Always put before theme.css so as not to override theme styles
  {% endcomment %}
  {% if request.page_type == 'product' %}
    {{ 'boxesapp.css' | asset_url | stylesheet_tag }}
    {{ 'boxesapp.js' | asset_url | script_tag }}
  {% endif %}
```

Secondly in the product template. With the theme I've been playing with I look for the `product_form` snippet and replace with:

```liquid
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
    <div id="app" style="font-size: 1.4rem">
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
