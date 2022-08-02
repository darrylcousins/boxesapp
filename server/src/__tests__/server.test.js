import request from "supertest";
import { resolve } from "path";
import { existsSync, unlinkSync } from "fs";
import { createHmac } from "crypto";
import { beforeAll, afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setupServer } from 'msw/node'
import { graphql, rest } from 'msw'
import "isomorphic-fetch";

import { serve } from "./serve.js";
import { Shopify } from "../lib/shopify/index.js";

const SHOP_NAME = "test-shop";

describe("shopify-app-node server", async () => {

  const { app } = await serve(process.cwd(), false);

 /*
  * Response:
  *   access_token: this is now our API_ACCESS key
  *   scope: the scope allowed by the merchant
  *   expires_in: ?
  */

  const restHandlers = [
    rest.post(`https://${process.env.SHOP}/admin/oauth/access_token`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json({
        code: req.body.code,
        accessToken: btoa("accessToken"),
        scopes: process.env.SHOPIFY_SCOPES,
      }))
    }),
    rest.post(`https://${process.env.SHOP}/webhooks`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json({
        webhook: {
          id: 11111111
        }
      }))
    }),
  ];

  const graphqlHandlers = [
  ];

  const server = setupServer(...restHandlers, ...graphqlHandlers)

  // Start server before all tests
  beforeAll(async () => {
    server.listen({ onUnhandledRequest: 'bypass' });
    await Shopify.initialize();
    Shopify.Registry.addHandler({topic: "TEST_HELLO", path: "shopify", handler: () => {}});
  })
  
  // Reset handlers after each test `important for test isolation`
  afterEach(() => server.resetHandlers())

  afterAll(() => {
    server.close();
    // mock mongodb close connection
    _mongodb.close();
    const dbFile = resolve(process.cwd(), "mongo.js");
    if (existsSync(dbFile)) {
      unlinkSync(dbFile);
    };
  })

  test("loads html on /", async () => {
    const response = await request(app).get("/").set("Accept", "text/html");

    expect(response.status).toEqual(200);
  });

  /* a bit slow because builds for production */
  /*
  test.concurrent(
    "properly handles nested routes in production mode",
    async () => {
      const { app: productionApp } = await serve(process.cwd(), true);

      const response = await request(productionApp)
        .get("/something")
        .set("Accept", "text/html");

      expect(response.status).toEqual(200);
    },
    20000
  );
  */

  test("redirects to auth if the app needs to be [re]installed", async () => {
    const response = await request(app)
      .get(`/?shop=${process.env.SHOP}`)
      .set("Accept", "text/html");

    expect(response.status).toEqual(302);
    expect(response.headers.location).toEqual(`/auth?shop=${process.env.SHOP}`);
  });

  test("goes to top level auth in oauth flow when there is no cookie", async () => {
    const response = await request(app).get("/auth").set("Accept", "text/html");

    expect(response.status).toEqual(302);
    expect(response.headers.location).toContain(`/auth/toplevel`);
  });

  test("renders toplevel auth page", async () => {
    const host = btoa(`${process.env.SHOP}/admin`);

    const response = await request(app)
      .get(`/auth/toplevel?shop=${process.env.SHOP}&host=${host}`)
      .set("Accept", "text/html");

    expect(response.status).toEqual(200);
    expect(response.text).toContain(`host: '${host}'`);
  });

  test("goes through oauth flow if there is a top level cookie", async () => {
    // get a signed top level cookie from the headers
    const { headers } = await request(app).get("/auth/toplevel");

    const response = await request(app)
      .get("/auth")
      .set("Cookie", ...headers["set-cookie"]);

    expect(response.status).toEqual(302);
    expect(response.headers.location).toContain(`/admin/oauth/authorize`);
  });

  describe("handles the callback correctly", () => {

    test("redirects to / with the shop and host if nothing goes wrong", async () => {

      const code = btoa("code");
      const host = btoa(`myhost`);
      const response = await request(app).get(
        `/auth/callback?host=${host}&shop=${process.env.SHOP}=${code}`
      );

      expect(response.status).toEqual(302);
      expect(response.headers.location).toEqual(
        `/?shop=${process.env.SHOP}&host=${host}`
      );

    });

    test("returns 400 if oauth is invalid", async () => {
      const host = btoa(`myhost`);
      const response = await request(app).get(
        `/auth/callback?host=${host}`
      );

      expect(response.status).toEqual(400);
    });

  });

  describe("webhook processing", () => {

    test.concurrent("processes webhooks", async () => {

      const body = JSON.stringify({
        shop: process.env.SHOP
      });

      const response = await request(app)
        .post("/shopify")
        .set(
          "X-Shopify-Hmac-Sha256",
          createHmac("sha256", process.env.SHOPIFY_API_SECRET)
            .update(body, "utf8")
            .digest("base64")
        )
        .set("X-Shopify-Topic", "TEST_HELLO")
        .set("X-Shopify-Shop-Domain", `${process.env.SHOP}`)
        .send(body);

      expect(response.status).toEqual(200);
    }, 12000);

  /*
    test("returns a 500 error if webhooks do not process correctly", async () => {
      process.mockImplementationOnce(() => {
        throw new Error("test 500 response");
      });

      const response = await request(app).post("/shopify");

      expect(response.status).toEqual(500);
      expect(response.text).toContain("test 500 response");
    });

    test("does not write to response if webhook processing has already output headers", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      process.mockImplementationOnce((request, response) => {
        response.writeHead(400);
        response.end();
        throw new Error("something went wrong");
      });

      const response = await request(app).post("/webhooks");

      expect(response.status).toEqual(400);
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.lastCall[0]).toContain("something went wrong");
    });
    */
  });

  /*
  describe("content-security-policy", () => {

    test("sets Content Security Policy for embedded apps", async () => {
      //Shopify.Context.IS_EMBEDDED_APP = true;

      const response = await request(app).get(
        `/?shop=${SHOP_NAME}.myshopify.test`
      );

      expect(response.headers["content-security-policy"]).toEqual(
        `frame-ancestors https://${SHOP_NAME}.myshopify.test https://admin.shopify.com;`
      );
    });

    test("sets header correctly when shop is missing", async () => {
      //Shopify.Context.IS_EMBEDDED_APP = true;

      const response = await request(app).get("/");

      expect(response.headers["content-security-policy"]).toEqual(
        `frame-ancestors 'none';`
      );
    });

    test("sets header correctly when app is not embedded", async () => {
      //Shopify.Context.IS_EMBEDDED_APP = false;

      const response = await request(app).get(
        `/?shop=${SHOP_NAME}.myshopify.test`
      );

      expect(response.headers["content-security-policy"]).toEqual(
        `frame-ancestors 'none';`
      );
    });
  });

*/

});
