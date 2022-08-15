/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
const md = await import("markdown-it").then(
  ({ default: fn }) => fn()
);

const _filename = (_meta) => _meta.url.split("/").pop();

const run = async () => {

  let markdown;
  const markdownPath = resolve(_filename(import.meta), "..", "markdown", "INSTALL.md");
  if (existsSync(markdownPath)) {
    markdown = readFileSync(markdownPath, {
        encoding:'utf8', flag:'r'
      });
  };
  const html = md.render(markdown);

};

const main = async () => {
  await run();
};

main().catch(console.error);




