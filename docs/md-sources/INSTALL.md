# SouthBridge Boxes

A client/server app to run a boxes app for Shopify.

Installation for a shopify site running on https://yourshop.myshopify.com.

# Add a subdomain

Make a subdomain e.g. https://yourshop.boxesapp.nz

Include the nginx cofiguration file to point to the proxied node app running on port (e.g. 4000);

```bash
cp server/docs/nginx/yourshop.boxesapp.nz /etc/nginx/site-available
```

Edits required to this file.

# Get code from git

```bash
git clone git@github.com:darrylcousins/boxesnode.git
```

# Install

```bash
cd client
npm install
```

```bash
cd server
npm install
```

# Client

Check the `base-url.js` file to point to the correct server. Check
`vite-config.js` for the install directory. I've been using
[ThemeKit](https://shopify.dev/themes/tools/theme-kit/) and directly building
and uploading the built files into the assets directory.

Note that the build is not minified because it failed on the staging shop due
to 'Uncaught TypeError: Invalid value used as weak map key', and when minified
this was a show stopper.

```bash
node build.js
```


# Mongo DB

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

# Settings

Import the settings, these appear to be adequate.

```bash
mongoimport --db=myshop --collection=settings --file=docs/settings/settings.json
```

Many settings have been made configurable by the administrator throught the
admin web interface. But to get things started import some default settings to
the mongo db. These default settings only include colours and translations.
Other settings such as box-rules, general, etc will need to be configure in the
admin.

```bash
mongoimport --db=yourshop --collection=settings --file=server/docs/settings/settings.json
```

NB: These needs to be tested. Perhaps more settings should also be created
using a script to read env at the very least manage setup of general settings:

## More settings

All settings are primarily used to configure the client app, though some also in the server.
TODO: More documentation of settings will be helpful.

### General

`db.settings.find({tag: "General"})`

Important! When building client this url is inserted but then pulls this url with other settings.
```js
{
  "handle": "api-url",
  "value": "https://yourshop.myshopify.com",
  ...
}
```

Must match tags set on `Box Produce` products in shopify to group products in client app and picking lists.
```js
{
  "handle": "product-tags",
  "value": "Vege,Bread,Fruit",
  ...
}
```

Must match the shopify product id of the custom box, this is to separate items
in the picking list allowing the packers to organise products for packing.
```js
{
  "handle": "box-rule",
  "value": "<CustomBox.shopify_product_id>",
  ...
}
```

### Box Rules

`db.settings.find({tag: "Boxes"})`

Box rules allow different text to be presented to user dependent on day of week and the box.

The weekday will match a variant title of the shopify `Container Box` product. More on this in the section [Shopify Products](/docs/SHOPIFY.md).

An example:

```js
{
  "handle": "box-rule",
  "tag": "Boxes",
  "value": "Some note to user about Thursday and Saturday boxes.",
  "weekday": [ "Thursday", "Saturday" ],
  "box_product_ids": [ 6163333333333, 6164444444444, 616555555555,  ],
  ...
}
```

### Other Box Rules

`db.settings.find({tag: "Box Cutoff"})`

These apply to all boxes for the given day an are the number of hours before
midnight of the day of delivery after which an order cannot be placed.

For example Thursday boxes will cut off at 10:30 on Tuesday morning.

```js
{
  "handle": "box-cutoff",
  "tag": "Box Cutoff",
  "weekday": "Thursday",
  "value": 37.5
  ...
}
```

`db.settings.find({tag: "Box Limit"})`

For example only 20 boxes total (of any type) can be ordered for a Tuesday.

NB setting a value of 0 means and infinite number (this is made clear in the
admin interface for editing this setting).

```js
{
  "handle": "box-limit",
  "tag": "Box Limit",
  "weekday": "Tuesday",
  "value": 20
  ...
}
```

# Env

```bash
cp server/docs/env/example-env server/.env
```

Edits required to this file.

`SHOPIFY_API_SECRET` - Comes with creating the custom app in partners dashboard

`SHOPIFY_API_KEY` - Comes with creating the custom app in partners dashboard

`RECHARGE_ACCESS_TOKEN` - From recharge - the store owner will need to grant
access to the tokens or supply them from the recharge admin

`RECHARGE_CLIENT_SECRET` - From recharge, as above

# Build the client

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
