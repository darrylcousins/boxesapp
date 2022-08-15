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
                If you have any queries about this email please contact <a href="mailto:{{ env.ADMIN_EMAIL }}">{{ env.ADMIN_EMAIL }}</a>.
              </p>
              <p style="color:#666;padding:5px 0;margin:0">
                You can view your subscriptions from your <a href="https://{{ env.SHOP }}/account">account page</a>.
              </p>
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
                <tr>
                  <td style="color:#777;text-align:right;padding-right:20px;">Next Charge Date</td>
                  <td>{{ subscription.attributes.nextChargeDate }}</td>
                </tr>
                <tr>
                  <td style="color:#777;text-align:right;padding-right:20px;">Next Scheduled Delivery</td>
                  <td style="font-weight:bold">{{ subscription.attributes.nextDeliveryDate }}</td>
                </tr>
                <tr>
                  <td style="color:#777;text-align:right;padding-right:20px;">Frequency</td>
                  <td>{{ subscription.attributes.frequency }}</td>
                </tr>
                <tr>
                  <td style="color:#777;text-align:right;padding-right:20px;">Total Price</td>
                  <td><span>$</span>{{ subscription.attributes.totalPrice | money }}</td>
                </tr>
                <tr>
                  <td style="color:#777;text-align:right;padding-right:20px;">Last Order</td>
                  <td>#{{ subscription.attributes.lastOrder.order_number }}</td>
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
            <mj-column>
              <mj-table>
                <tr>
                  <td style="color:#777;text-align:right;padding-right:20px;">Subscription ID</td>
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
                  <td width="100px" style="color:#777;text-align:left;padding:0px 20px 20px 0px;">
                    Includes:
                  </td>
                  <td valign="top">
                    {{ subscription.properties["Including"] | replace: ",", ", " }}
                  </td>
                </tr>
                <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
                  <td width="100px" style="color:#777;text-align:left;padding:0px 20px 20px 0px;">
                    Add on items:
                  </td>
                  <td valign="top">
                    {{ subscription.properties["Add on Items"] | replace: ",", ", " }}
                  </td>
                </tr>
                <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
                  <td width="100px" style="color:#777;text-align:left;padding:0px 20px 20px 0px;">
                    Swapped items:
                  </td>
                  <td valign="top">
                    {{ subscription.properties["Swapped Items"] | replace: ",", ", " }}
                  </td>
                </tr>
                <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
                  <td width="100px" style="color:#777;text-align:left;padding:0px 20px 20px 0px;">
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
                    <td width="45px">
                      <div
                        style="background-image:url('{{ subscription.attributes.images[product.title] }}');background-size:cover;width:40px;height:40px;border:1px solid #ccc"></div>
                    </td>
                    <td>
                      {{ product.title }}
                    </td>
                    <td>
                      {{ product.quantity }}
                    </td>
                    <td style="text-align:right">
                      <span>$</span>{{ product.total_price | money }}
                    </td>
                  </tr>
                {% endfor %}
                <tr>
                  <td colspan="4" style="text-align:right;border-top:1px solid #333">
                    <span>$</span>{{ subscription.attributes.totalPrice | money }}
                  </td>
                </tr>
              </mj-table>
            </mj-column>
          </mj-section>
          <mj-section padding-top="0px">
            <mj-column>
              <mj-table>
                {% if subscription.attributes.newIncludedInThisBox.size > 0 %}
                  <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
                    <td valign="top" width="100px">
                      New this box:
                    </td>
                    <td valign="top" style="padding-left: 20px">
                      {{ subscription.attributes.newIncludedInThisBox | join: ", " }}
                    </td>
                  </tr>
                {% endif %}
                {% if subscription.attributes.notIncludedInThisBox.size > 0 %}
                  <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
                    <td valign="top" width="100px">
                      Not in this box:
                    </td>
                    <td valign="top" style="padding-left: 20px">
                      {{ subscription.attributes.notIncludedInThisBox | join: ", " }}
                    </td>
                  </tr>
                {% endif %}
                {% if subscription.attributes.nowAvailableAsAddOns.size > 0 %}
                  <tr style="padding-bottom:5px;border-bottom:1px solid #ddd">
                    <td valign="top" width="100px">
                      New add ons:
                    </td>
                    <td valign="top" style="padding-left: 20px">
                      {{ subscription.attributes.nowAvailableAsAddOns | join: ", " }}
                    </td>
                  </tr>
                {% endif %}
              </mj-table>
            </mj-column>
          </mj-section>
        {% endfor %}
        `;
