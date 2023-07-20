export default `
<mj-section padding-bottom="0px">
  <mj-column>
    <mj-text align="center" font-size="25px" font-style="bold" color="#4e1018">
    {{ env.SHOP }}
    </mj-text>
    <mj-text align="left">
      <p style="color:#666;padding:5px 0;margin:0">
        The service that does some of the work has found the following orphaned subscriptions:
        <ul style="list-style: none; padding-top: 10px; font-style:normal">
          {% for orphan in orphans %}
            <li style="list-style: none; padding-top: 10px">
              {{ orphan.customer.first_name }} {{ orphan.customer.last_name }} &lt;{{ orphan.customer.email }}&gt;
              <ul style="padding-bottom: 10px; padding-top: 10px">
                {% for orphaned in orphan.orphans %}
                  <li style="list-style: none">
                    {{ orphaned.title }}
                    <dl style="
        border: 1px solid grey;
        padding: 0.5em;
                    ">
                      <dt style="
        float: left;
        clear: left;
        width: 100px;
        text-align: right;
        font-weight: bold;
        color: grey;
                      ">Product title</dt>
                      <dd style="
        margin: 0 0 0 110px;
        padding: 0 0 0.5em 0;
                      ">{{ orphaned.title }}</dd>
                      <dt style="
        float: left;
        clear: left;
        width: 100px;
        text-align: right;
        font-weight: bold;
        color: grey;
                      ">Subscription ID</dt>
                      <dd style="
        margin: 0 0 0 110px;
        padding: 0 0 0.5em 0;
                      ">{{ orphaned.subscription_id }}</dd>
                      {% if orphaned.next_charge_scheduled_at %}
                      <dt style="
        float: left;
        clear: left;
        width: 100px;
        text-align: right;
        font-weight: bold;
        color: grey;
                      ">Next charge</dt>
                      <dd style="
        margin: 0 0 0 110px;
        padding: 0 0 0.5em 0;
                      ">
                      {{ orphaned.next_charge_scheduled_at }}
                      {% endif %}
                      {% if orphaned.cancelled_at %}
                      <dt style="
        float: left;
        clear: left;
        width: 100px;
        text-align: right;
        font-weight: bold;
        color: grey;
                      ">Cancelled at</dt>
                      <dd style="
        margin: 0 0 0 110px;
        padding: 0 0 0.5em 0;
                      ">
                      {{ orphaned.next_cancelled_at }}
                      {% endif %}
                      </dd>
                      <dt style="
        float: left;
        clear: left;
        width: 100px;
        text-align: right;
        font-weight: bold;
        color: grey;
                      ">Last updated</dt>
                      <dd style="
        margin: 0 0 0 110px;
        padding: 0 0 0.5em 0;
                      ">{{ orphaned.updated_at }}</dd>
                    </dl>
                  </li>
                {% endfor %}
              </ul>
            </li>
          {% endfor %}
        </ul>
      </p>
    </mj-text>
  </mj-column>
</mj-section>
`;
