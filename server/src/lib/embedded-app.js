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
  logo,
  shop_title,
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
      background-image: url('${logo}');
      background-attachment: fixed;
      background-position-x: center;
      background-position-y: 15%;
      background-repeat: no-repeat;
      background-blend-mode: overlay;
      background-color: #efefef;
      border: 1px solid #666;
      height: 400px;
      align-content: space-between;
      margin: 2em;
      color: #333;
      .header {
        margin: 2em;
        border-bottom: 1px solid;
        h3 {
          margin: 0 auto 1em auto;
        }
      }
      .body {
        margin: 0 5em;
        border-sizing: border-box;
        /*
        display: flex;
        flex-wrap: wrap;
        */
        a {
          color: #000;
          text-decoration: none;
        }
        a:hover {
          color: #666;
          text-decoration: underline;
        }
        button {
          cursor: pointer;
          border-radius: 3px;
          padding: 1em;
          margin: 1em;
          border-sizing: border-box;
          border: 1px solid black;
          outline: 0;
          font-size: inherit;
          font-weight: bold;
          margin: 2em auto;
          background-color: navy;
          color: white;
        }
      }
    }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h3>Boxes App</h3>
      </div>
      <div class="body">
        <p>&bull;&nbsp;For more information, documentation, changelogs, and musings on the development of <b>boxesapp</b> please visit
          <a target="_blank" href="https://boxesapp.nz">boxesapp.nz</a>
        </p>
        <p>&bull;&nbsp;For problems, bugs, and  suggestions please contact
          <a target="_blank" href="mailto:darryljcousins@gmail.com">darryljcousins@gmail.com</a> or on 027 524 7293.
        </p>
        <p>&bull;&nbsp;To access the <b>boxesapp</b> administraton portal please follow the button below: 
        </p>
        <button
          title="Admin Portal"
          type="button"
          onclick="window.open('${portal_url}', '_blank')"
          >${shop_title} BoxesApp Portal</button>
      </div>
    </div>
  </body>
</html>`;
};

