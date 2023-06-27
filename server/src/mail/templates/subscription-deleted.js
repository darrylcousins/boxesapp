export default `
<mj-section padding-bottom="0px">
  <mj-column>
    <mj-text align="center" font-size="25px" font-style="bold" color="#4e1018">
    {{ env.SHOP }}
    </mj-text>
    <mj-text align="left">
      <p style="color:#666;padding:5px 0;margin:0">
        You are receiving this email because you have deleted a box subscription with <a href="https://{{ env.SHOP }}">{{ env.SHOP_TITLE }}</a>.
      </p>
      <p style="color:#666;padding:5px 0;margin:0">
        If you have any queries about this email please contact <a href="mailto:{{ admin_email }}">{{ admin_email }}</a>.
      </p>
      <p style="color:#666;padding:5px 0;margin:0">
        If you have any other subscriptions they can be viewed
        <a
            href="https://{{env.SHOP}}{{env.PROXY_PATH}}/customer-portal?cid={{customer.external_customer_id.ecommerce}}">here</a>.
      </p>
      <p style="color:#666;padding:5px 0;margin:0">
        The deleted subscription included:
        <ul>
          <li>
              {{ box.product_title }} - {{ box.variant_title }}
          </li>
          {% for item in included %}
            <li>
              {{ item.product_title }} ({{ item.quantity }})
              
            </li>
          {% endfor %}
        </ul>
      </p>
    </mj-text>
  </mj-column>
</mj-section>
`;



