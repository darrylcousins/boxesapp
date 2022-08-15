/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import express from "express";
import markdown from "./markdown.js";

const app = express();
const port = 4000;

app.get('/', async (req, res) => {
  res.setHeader("Content-Type", "text/html");
  const html = await markdown();
  console.log(html);
  res.send(html);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
