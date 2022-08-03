/**
 * Testing Only
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import EditProducts from "../products/edit-products";
import { Fetch } from "../lib/fetch";

/**
 * Testing only
 *
 */
export default async () => {

  /**
   * Fetch box data
   *
   * @function getBox
   */
  const product_id = 6163982876822;
  const title = "The Small Vege Box";
  const order_id = "62c26f6eb25e85f7afb5ecee";
  const timestamp = new Date(Date.parse("Thu Jul 14 2022")).getTime();
  const uri = `/api/get-reconciled-box/${title}/${timestamp}/${order_id}`;
  const { error, json } = await Fetch(uri);
  console.log(json);
  if (error) console.warn(error);
  const { box, properties, messages } = json;
  console.log(properties);
  console.log(messages);

  return <EditProducts box={ box } properties={ properties } />;
}

