import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FILMSTRIP_MIN, currentFigure, figureCaptions, pad2 } from "../src/lib/article-filmstrip.ts";

test("the current figure is the last one above 55% of the viewport", () => {
  const boxes = [{ top: -900, bottom: -500 }, { top: 300, bottom: 700 }, { top: 1200, bottom: 1600 }];
  assert.deepEqual(currentFigure(boxes, 1000), { index: 1, on: true, before: false });
  assert.deepEqual(currentFigure(boxes.map((b) => ({ top: b.top + 2000, bottom: b.bottom + 2000 })), 1000), { index: 0, on: false, before: true });
  assert.deepEqual(currentFigure([{ top: -900, bottom: -500 }], 1000), { index: 0, on: false, before: false });
  assert.deepEqual(currentFigure([], 1000).index, -1);
});

test("captions prefer alt, then the caption under the image, then section · fig N", () => {
  const captions = figureCaptions([
    { alt: "首页截图。", caption: "", section: "缘起" },
    { alt: "", caption: "工作台", section: "缘起" },
    { alt: "", caption: "", section: "缘起" },
    { alt: "", caption: "", section: "缘起" },
    { alt: "", caption: "", section: "" },
  ], "开头", "图 {n}");
  assert.deepEqual(captions, ["首页截图", "工作台", "缘起 · 图 1", "缘起 · 图 2", "开头 · 图 1"]);
});

test("small helpers and the opt-in threshold", () => {
  assert.equal(pad2(3), "03");
  assert.equal(pad2(12), "12");
  assert.equal(FILMSTRIP_MIN, 3);
});

test("filmstrip is opt-in per post through the content schema", async () => {
  const schema = await readFile(new URL("../src/content.config.ts", import.meta.url), "utf8");
  assert.match(schema, /filmstrip: z\.boolean\(\)\.optional\(\)/);
  const layout = await readFile(new URL("../src/layouts/PostLayout.astro", import.meta.url), "utf8");
  assert.match(layout, /filmstrip = false/);
  assert.match(layout, /\{filmstrip && <ArticleFilmstrip/);
  for (const page of ["../src/pages/posts/[slug].astro", "../src/pages/en/posts/[slug].astro"]) {
    assert.match(await readFile(new URL(page, import.meta.url), "utf8"), /filmstrip=\{\w+\.data\.filmstrip\}/);
  }
});
