/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const md = await import("markdown-it").then(
  ({ default: fn }) => fn()
);

const _filename = (_meta) => _meta.url.split("/").pop();

export default async (page) => {

  let markdown;
  let html = null;
  const markdownPath = resolve(_filename(import.meta), "..", "markdown", "INSTALL.md");

  if (existsSync(markdownPath)) {
    markdown = readFileSync(markdownPath, {
        encoding:'utf8', flag:'r'
      });
    html = md.render(markdown);
  };

  return html;
};

