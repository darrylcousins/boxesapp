import {createElement} from "@b9g/crank";
import Customer from "../../../resources/admin/components/recharge/customer";

export default async function Home() {
  const customerJson = document.querySelector("#customer-json");
  const customer = await JSON.parse(customerJson.textContent);
  console.log(customer.id);
  return <Customer customer={ customer } admin={ false } /> ;
};
