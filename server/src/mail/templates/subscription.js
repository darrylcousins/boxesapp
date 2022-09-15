export default `
<mj-section padding-bottom="0px">
  <mj-column>
    <mj-text align="center" font-size="25px" font-style="bold" color="#4e1018">
    {{ env.SHOP }}
    </mj-text>
    <mj-text align="left">
      <p style="color:#666;padding:5px 0;margin:0">
        You are receiving this email because you have a box subscription with <a href="https://{{ env.SHOP }}">{{ env.SHOP_TITLE }}</a>.
      </p>
      <p style="color:#666;padding:5px 0;margin:0">
        If you have any queries about this email please contact <a href="mailto:{{ admin_email }}">{{ admin_email }}</a>.
      </p>
      <p style="color:#666;padding:5px 0;margin:0">
        You can view your subscriptions from your <a
          href="https://{{ env.SHOP }}/account"
        >account page</a> and edit, pause or cancel 
            your subscribed box{% if subscriptions.size > 1 %}es{% endif %}
        <a
            href="https://{{env.SHOP}}{{env.PROXY_PATH}}/customer-portal?cid={{subscriptions[0].attributes.customer.external_customer_id.ecommerce}}">here</a>.
      </p>
      {% if type == "upcoming" %}
        <p style="color:#4e1018;padding:5px 0;padding-top:15px;margin:0">
          You still have a couple of days before the order is created in which to add items or otherwise
        <a style="color:#4e1018;"
            href="https://{{env.SHOP}}{{env.PROXY_PATH}}/customer-portal?cid={{subscriptions[0].attributes.customer.external_customer_id.ecommerce}}">update your box</a>.
        </p>
      {% endif %}
    </mj-text>
  </mj-column>
</mj-section>
{% for subscription in subscriptions %}
  <mj-section padding-bottom="0px">
    <mj-column>
      <mj-text align="center" font-size="25px" font-style="bold" color="#4e1018">
      {{ subscription.box.shopify_title }} - {{ subscription.attributes.variant }}
      </mj-text>
    </mj-column>
  </mj-section>
  <mj-section padding="0px">
    <mj-column>
      <mj-table align="center" width="300px">
        {% if type == "upcoming" %}
          <tr>
            <td style="color:#777;text-align:right;padding-right:20px;">Next Order Date</td>
            <td>{{ subscription.attributes.nextChargeDate }}</td>
          </tr>
          <tr>
            <td style="color:#777;text-align:right;padding-right:20px;">Next Scheduled Delivery</td>
            <td style="font-weight:bold">{{ subscription.attributes.nextDeliveryDate }}</td>
          </tr>
        {% endif %}
        <tr>
          <td style="color:#777;text-align:right;padding-right:20px;">Frequency</td>
          <td>{{ subscription.attributes.frequency }}</td>
        </tr>
        <tr>
          <td style="color:#777;text-align:right;padding-right:20px;">Price (excl. shipping)</td>
          <td><span>$</span>{{ subscription.attributes.totalPrice | money }}</td>
        </tr>
        {% if type == "upcoming" %}
          {% if subscription.attributes.lastOrder %}
            <tr>
              <td style="color:#777;text-align:right;padding-right:20px;">Last Order</td>
              <td>#{{ subscription.attributes.lastOrder.order_number }}</td>
            </tr>
          {% endif %}
        {% else %}
          <tr>
            <td style="color:#777;text-align:right;padding-right:20px;">Current Order</td>
            <td>#{{ subscription.attributes.lastOrder.order_number }}</td>
          </tr>
        {% endif %}
        <tr>
          <td style="color:#777;text-align:right;padding-right:20px;">Subscription ID</td>
          <td>{{ subscription.attributes.subscription_id }}</td>
        </tr>
      </mj-table>
    </mj-column>
  </mj-section>
  <mj-section padding-top="0px">
    <mj-column>
      <mj-table>
        <tr>
          <td style="color:#777">Delivering To:</td>
        </tr>
        <tr>
          <td>{{ subscription.address.name }}</td>
        </tr>
        <tr>
          <td>{{ subscription.address.address1 }}</td>
        </tr>
        {% if subscription.address.address2 %}
          <tr>
            <td>{{ subscription.address.address1 }}</td>
          </tr>
        {% endif %}
        <tr>
          <td>{{ subscription.address.city }}</td>
        </tr>
        <tr>
          <td>{{ subscription.address.zip }}</td>
        </tr>
      </mj-table>
    </mj-column>
    <!--
    <mj-column>
      <mj-table>
        <tr>
          <td style="color:#777;text-align:right;padding-right:20px;">subscription id</td>
          <td>{{ subscription.attributes.subscription_id }}</td>
        </tr>
        {% if subscription.attributes.charge_id %}
        <tr>
          <td style="color:#777;text-align:right;padding-right:20px;">Charge ID</td>
          <td>{{ subscription.attributes.charge_id }}</td>
        </tr>
        {% endif %}
        <tr>
          <td style="color:#777;text-align:right;padding-right:20px;">Address ID</td>
          <td>{{ subscription.attributes.address_id }}</td>
        </tr>
        <tr>
          <td style="color:#777;text-align:right;padding-right:20px;">Recharge Customer ID</td>
          <td>{{ subscription.attributes.customer.id }}</td>
        </tr>
        <tr>
          <td style="color:#777;text-align:right;padding-right:20px;">Shopify Customer ID</td>
          <td>{{ subscription.attributes.customer.external_customer_id.ecommerce }}</td>
        </tr>
      </mj-table>
    </mj-column>
    -->
  </mj-section>
  <mj-section padding-top="0px">
    <mj-column>
      <mj-table>
        <tr>
          <td>
            {% for message in subscription.messages %}
              <p style="color:#162842;padding:0;margin:0">
                {{ message }}
              </p>
            {% endfor %}
          </td>
        </tr>
      </mj-table>
    </mj-column>
  </mj-section>
  <mj-section padding-top="0px">
    <mj-column>
      <mj-table>
        <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
          <td valign="top" width="100px" style="color:#777;text-align:left;padding:0px 20px 20px 0px;">
            Includes:
          </td>
          <td valign="top">
            {{ subscription.properties["Including"] | replace: ",", ", " }}
          </td>
        </tr>
        <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
          <td valign="top" width="100px" style="color:#777;text-align:left;">
            Add on items:
          </td>
          <td valign="top">
            {{ subscription.properties["Add on Items"] | replace: ",", ", " }}
          </td>
        </tr>
        <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
          <td valign="top" width="100px" style="color:#777;text-align:left;">
            Swapped items:
          </td>
          <td valign="top">
            {{ subscription.properties["Swapped Items"] | replace: ",", ", " }}
          </td>
        </tr>
        <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
          <td valign="top" width="100px" style="color:#777;text-align:left;">
            Removed items:
          </td>
          <td valign="top">
            {{ subscription.properties["Removed Items"] | replace: ",", ", " }}
          </td>
        </tr>
      </mj-table>
    </mj-column>
  </mj-section>
  <mj-section padding-top="0px">
    <mj-column>
      <mj-table>
        {% for product in subscription.includes %}
          <tr>
            <td width="45px" style="padding: 3px 0px">
              <div
                style="background-image:url('{{ subscription.attributes.images[product.title] }}');background-size:cover;width:40px;height:40px;border:1px solid #ccc"></div>
            </td>
            <td>
              {{ product.title }}
            </td>
            <td>
              {{ product.quantity }}
            </td>
            <td width="45px" style="text-align:right">
              <span>$</span>{{ product.total_price | money }}
            </td>
          </tr>
        {% endfor %}
        <tr>
          <td colspan="3" style="text-align:left;border-top:1px solid #333">
            Total (excl. shipping).
          </td>
          <td width="45px" style="text-align:right;border-top:1px solid #333">
            <span>$</span>{{ subscription.attributes.totalPrice | money }}
          </td>
        </tr>
      </mj-table>
    </mj-column>
  </mj-section>
  {% if type == "upcoming" %}
    <mj-section padding-top="0px">
      <mj-column>
        <mj-table>
          {% if subscription.attributes.newIncludedInThisBox.size > 0 %}
            <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
              <td valign="top" width="120px">
                New in box:
              </td>
              <td valign="top" style="padding: 5px 0px 5px 20px">
                {{ subscription.attributes.newIncludedInThisBox | join: ", " }}
              </td>
            </tr>
          {% endif %}
          {% if subscription.attributes.notIncludedInThisBox.size > 0 %}
            <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
              <td valign="top" width="120px">
                Not in box:
              </td>
              <td valign="top" style="padding: 5px 0px 5px 20px">
                {{ subscription.attributes.notIncludedInThisBox | join: ", " }}
              </td>
            </tr>
          {% endif %}
          {% if subscription.attributes.nowAvailableAsAddOns.size > 0 %}
            <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
              <td valign="top" width="120px">
                New add ons:
              </td>
              <td valign="top" style="padding: 5px 0px 5px 20px">
                {{ subscription.attributes.nowAvailableAsAddOns | join: ", " }}
              </td>
            </tr>
          {% endif %}
        </mj-table>
      </mj-column>
    </mj-section>
  {% endif %}
{% endfor %}
`;
