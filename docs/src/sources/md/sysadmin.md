# System Administrator

This document details installation by the system administrator of the app server for a
shopify site running on https://yourshop.myshopify.com.

In the case of BoxesApp, then this person is me, the developer.

## Requirements

* [NodeJS](https://nodejs.org/en/)
* [Nginx](https://www.nginx.com/)
* [MongoDB](https://www.mongodb.com/)
* [Git](https://git-scm.com/)

## Get code from git

```bash
git clone git@github.com:darrylcousins/boxesnode.git
```

## Add a subdomain

Make a subdomain e.g. `https://yourshop.boxesapp.nz` and obtain a ssl certificate.

Include the nginx cofiguration file to point to the proxied node app running on
port (e.g. `4000`). Edits required to this file.

```bash
cp server/docs/nginx/yourshop.boxesapp.nz /etc/nginx/site-available
```

The following lines will need to be edited:

```nginx
server_name yourshop.yourappserver.nz;

ssl_certificate /path/to/letsencrypt/live/fullchain.pem;
ssl_certificate_key /path/to/letsencrypt/privkey.pem;

set $my_port 4000;
set $my_cors https://yourshop.myshopify.com;

root /home/cousinsd/Projects/boxesapp/server/dist/client;
```

## Install

```bash
cd boxesapp/client
npm install
```

```bash
cd boxesapp/server
npm install
```

## Mongo DB

Setting up the database can all be done using mongo shell. The database name,
user and password will go into `.env`.

```bash
mongosh --nodb
test> show dbs
test> use yourshop # creates the database
yourshop> db.createUser({ user: "yourshop", pwd: "**********", roles: [{ role: "readWrite", db: "yourshop" }]}
yourshop> show users
```

The collections will be created on the fly as data is entered but will be:

```bash
mongosh "mongodb://localhost:27017/yourshop"
yourshop> show collections
boxes
logs
orders
registry
settings
```

## Env

```bash
cp server/docs/env/example-env server/.env
```

```monkey
PORT="4000"
HOST="https://yourshop.yourappserver.nz"
MAIL_DOMAIN="yourappserver.nz"

ALLOW_ORIGINS="yourshop.yourappserver.nz"
SERVER_NAME="yourshop.yourappserver.nz"
SERVER_EMAIL="server@yourappserver.nz"
ADMIN_EMAIL="admin@yourshop.com"
ADMIN_TITLE="Your Shop Boxes"

# mongodb
DB_NAME="yourshop"
DB_USER='yourshop'
DB_PASSWORD='*************'

SHOP_NAME="yourshop"

# proxy path configured in shopify partner app admin
PROXY_PATH="/tools/boxes"

# shopify api pairs
SHOP="yourshop.myshopify.com"
SHOPIFY_API_VERSION="2022-04"
SHOPIFY_API_SECRET="*******************************************"
SHOPIFY_API_KEY="*******************************************"
SCOPES="read_orders,write_orders,read_inventory,write_inventory,read_locations,read_script_tags,write_script_tags,read_products,write_products,read_customers,write_customers,write_draft_orders"

# recharge api pairs
RECHARGE_URL="https://api.rechargeapps.com"
RECHARGE_SHOP_NAME="yourshop-sp"
RECHARGE_VERSION="2021-11"
RECHARGE_ACCESS_TOKEN="sk_1x1_*******************************************"
RECHARGE_CLIENT_SECRET="**********************************************************"
```

Edits are required to this file.

## Building the Client

Check the `boxesapp/client/src/base-url.js` file:

```javascript
export default "https://yourshop.yourappserver.nz/api/";
```

This url should point to the domain created above. Check
`vite-config.js` for the install directory. I've been using
[ThemeKit](https://shopify.dev/themes/tools/theme-kit/) and directly building
and uploading the built files into the assets directory.

```bash
cd boxesapp/client
node build.js
```

## Settings

Import the settings, these appear to be adequate.

Almost all settings have been made configurable for the store owner through the
admin web interface. But to get things started sysadmin can import some default settings to
the mongo db. These default settings only include colours and translations.
Other settings such as box-rules, general, etc will need to be configure in the
admin.

<div class="todo">
<p>
<ul class="list">
<li>These needs to be tested - are all settings included?</li>
<li>Are any missing in this initial import?</li>
<li>Perhaps an interactive interface for intitial configuration to help store owner?</li>
<li>More documentation of settings will be helpful</li>
</ul>
</p>
</div>

```bash
mongoimport --db=yourshop --collection=settings --file=server/docs/settings/settings.json
```

#### General

```bash
yourshop> db.settings.find({tag: "General"})
```

Must match `base-url` for client.

```json
{
  "handle": "api-url",
  "value": "https://yourshop.myshopify.com",
  ...
}
```

Must match tags set on `Box Produce` products in shopify to group products in client app and picking lists.

```json
{
  "handle": "product-tags",
  "value": "Vege,Bread,Fruit",
  ...
}
```

Must match the shopify product id of the custom box, this is to separate items
in the picking list allowing the packers to organise products for packing.

```json
{
  "handle": "custom-box-id",
  "value": "<Integer: CustomBox.shopify_product_id>",
  ...
}
```

Store owner/admin email.

```json
{
  "handle": "admin-email",
  "value": "<String: adminEmail>",
  ...
}
```

#### Box Rules

```bash
yourshop> db.settings.find({tag: "Boxes"})
```

Box rules allow different text to be presented to customer order widget dependent on day of week and the box.

The weekday will match a variant title of the shopify `Container Box` product.

An example:

```json
{
  "handle": "box-rule",
  "tag": "Boxes",
  "value": "Some note to user about Thursday and Saturday boxes.",
  "weekday": [ "Thursday", "Saturday" ],
  "box_product_ids": [ 6163333333333, 6164444444444, 616555555555,  ],
  ...
}
```

#### Other Box Rules

```bash
yourshop> db.settings.find({tag: "Box Cutoff"})
```

These apply to all boxes for the given day an are the number of hours before
midnight of the day of delivery after which an order cannot be placed.

For example Thursday boxes will cut off at 10:30 on Tuesday morning.

```json
{
  "handle": "box-cutoff",
  "tag": "Box Cutoff",
  "weekday": "Thursday",
  "value": 37.5
  ...
}
```

```bash
yourshop> db.settings.find({tag: "Box Limit"})
```

For example only 20 boxes total (of any type) can be ordered for a Tuesday.

NB setting a value of 0 means and infinite number (this is made clear in the
admin interface for editing this setting).

```json
{
  "handle": "box-limit",
  "tag": "Box Limit",
  "weekday": "Tuesday",
  "value": 20
  ...
}
```

## Build the client

```bash
cp client/src/base-url.example.js client/src/base-url.js
```

Edits required to this file.

In the development environment I'm using
[ThemeKit](https://shopify.dev/themes/tools/theme-kit) to download the theme
into `client`. This will be apparent in `client/vite.config.js`. By running
`theme watch` in this folder I can build the client and the files will be
uploaded. Change `vite.config.js` to reflect a different `output.dir` if required.

Run the build script:

```bash
cd client
node build.js
```
