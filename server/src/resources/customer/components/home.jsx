import {createElement} from "@b9g/crank";
import Customer from "../../../resources/admin/components/recharge/customer";

export default async function Home() {
  const customerJson = document.querySelector("#customer-json");
  const customer = await JSON.parse(customerJson.textContent);
  const cid = document.getElementById('initialize').getAttribute('cid');
  if (cid !== customer.id) {
    window.location.assign(window.location.href.split('?')[0]);
  };

  return <Customer customer={ customer } admin={ false } /> ;
};
