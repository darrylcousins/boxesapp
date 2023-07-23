export default `
<mj-section padding-bottom="0px">
  <mj-column>
    <mj-text align="center" font-size="25px" font-style="bold" color="#4e1018">
    {{ env.SHOP }}
    </mj-text>
    <mj-text align="left">
      <p style="color:#666;padding:5px 0;margin:0">
        The service that does some of the work has updated the local database of subscribers.
      </p>
      <ul style="padding-bottom: 10px; padding-top: 10px">
        <li style="list-style: none">
          <dl style="
            border: 1px solid grey;
            padding: 0.5em;
          ">
            <dt style="
              float: left;
              clear: left;
              width: 330px;
              text-align: right;
              font-weight: bold;
              color: grey;
            ">Existing count</dt>
            <dd style="
              margin: 0 0 0 350px;
              padding: 0 0 0.5em 0;
            ">{{ existingCount }}</dd>
            <dt style="
              float: left;
              clear: left;
              width: 330px;
              text-align: right;
              font-weight: bold;
              color: grey;
            ">Updated count</dt>
            <dd style="
              margin: 0 0 0 350px;
              padding: 0 0 0.5em 0;
            ">{{ updatedCount }}</dd>
            <dt style="
              float: left;
              clear: left;
              width: 330px;
              text-align: right;
              font-weight: bold;
              color: grey;
            ">Subscribers with active subscriptions</dt>
            <dd style="
              margin: 0 0 0 350px;
              padding: 0 0 0.5em 0;
            ">{{ activeCount }}</dd>
            <dt style="
              float: left;
              clear: left;
              width: 330px;
              text-align: right;
              font-weight: bold;
              color: grey;
            ">Subscribers without active subscriptions</dt>
            <dd style="
              margin: 0 0 0 350px;
              padding: 0 0 0.5em 0;
            ">{{ inactiveCount }}</dd>
          </dl>
        </li>
      </ul>
      {% if activeNoChargeCount > 0 %}
        <p>
          Subscribers with active subscriptions but no upcoming charges.
          This may mean there was a problem with payment. Their Recharge id is listed below.
        </p>
        <ul style="padding-bottom: 10px; padding-top: 10px">
          <li style="list-style: none">
            <dl style="
              border: 1px solid grey;
              padding: 0.5em;
            ">
            {% for customer in activeNoCharges %}
              <dt style="
                float: left;
                clear: left;
                width: 330px;
                text-align: right;
                font-weight: bold;
                color: grey;
              ">{{ customer.name }}</dt>
              <dd style="
                margin: 0 0 0 350px;
                padding: 0 0 0.5em 0;
              ">{{ customer.recharge_id }}</dd>
            {% endfor %}
            </dl>
          </li>
        </ul>
      {% endif %}
    </mj-text>
  </mj-column>
</mj-section>
`;

