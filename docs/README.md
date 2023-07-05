# boxesapp.nz

Build the docs with:

```bash
cd docs
npm run build
```

The example nginx conf file in `files/nginx` can be used to serve the build.

# Notes

## clone/copy a database

```bash
mongodump --archive --db=southbridge | mongorestore --archive  --nsFrom='southbridge.*' --nsTo='southbridgedev.*'
```

## screencast and editing

Using Kazam for screencast and Openshot for editing.
