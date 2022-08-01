/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/**
  * Single page embedded app with link to portal
  *
 */
export default function embeddedAppRedirect({
  apiKey,
  host,
  portal_url,
}) {
  return `<!DOCTYPE html>
<html>
  <head>
    <script src="https://unpkg.com/@shopify/app-bridge@2"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        var AppBridge = window['app-bridge'];
        var createApp = AppBridge.default;
        var Redirect = AppBridge.actions.Redirect;

        const app = createApp({
          apiKey: '${apiKey}',
          host: '${host}',
        });

        const redirect = Redirect.create(app);
        //redirect.dispatch(Redirect.Action.APP, "/app");

      });
    </script>
    <style>
    body {
      font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif;
      font-weight: 400;
      font-size: 1em;
    }
    .container {
      display: flex;
      flex-wrap: wrap;
      height: 400px;
      align-content: space-between;
      margin: 2em;
    }
    .box {
      width: 50%;
    }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="box">Boxes App</div>
      <div class="box"><a href='${ portal_url }' target="_blank" title="Admin Portal">Admin Portal</a></div>
    </div>
  </body>
</html>`;
};

