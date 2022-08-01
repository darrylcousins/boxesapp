import { resolve } from "path";
import { fileURLToPath } from "url";

const port = 9528;

/**
 * @param {string} root
 * @param {boolean} isProd
 */
export async function serve(root, isProd) {
  if (isProd) {
    // build first
    const { build } = await import("vite");
    await build({
      root,
      logLevel: "silent",
      build: {
        target: "esnext",
        minify: false,
        ssrManifest: true,
        outDir: "dist/client",
        rollupOptions: {
          input: {
            app: resolve(root, "/src/assets/index.html"),
          },
        },
      },
    });
  }

  const { createServer } = await import(
    resolve(root, "src", "index.js")
  );
  process.env.PORT = port;
  return await createServer(root, isProd);
}
