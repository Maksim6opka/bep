import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/tools/markdown-pdf/pagination.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { paginate } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("moves a short quote across the page boundary intact", () => {
  assert.deepEqual(paginate(180, 100, [{ top: 85, bottom: 125 }]), [
    { top: 0, bottom: 85 }, { top: 85, bottom: 180 },
  ]);
});

test("splits an oversized paragraph only between its text lines", () => {
  const lines = Array.from({ length: 20 }, (_, i) => ({ top: i * 17, bottom: i * 17 + 15 }));
  const pages = paginate(340, 100, [{ top: 0, bottom: 340 }, ...lines]);
  assert.equal(pages.at(-1).bottom, 340);
  for (const page of pages.slice(0, -1)) {
    assert.ok(lines.every(line => !(line.top < page.bottom && line.bottom > page.bottom)));
  }
});

test("keeps headings with the following content through overlapping regions", () => {
  assert.equal(paginate(180, 100, [
    { top: 90, bottom: 130 }, // Paragraph.
    { top: 70, bottom: 105 }, // Heading plus the first line.
  ])[0].bottom, 70);
});

test("does not add a blank page at an exact boundary", () => {
  assert.deepEqual(paginate(200, 100, [{ top: 80, bottom: 100 }]), [
    { top: 0, bottom: 100 }, { top: 100, bottom: 200 },
  ]);
});

test("preserves all content without gaps, overlaps, or a document length cap", () => {
  const regions = Array.from({ length: 2000 }, (_, i) => ({ top: i * 37, bottom: i * 37 + 32 }));
  const pages = paginate(74000, 1000, regions);
  assert.ok(pages.length > 33);
  assert.equal(pages[0].top, 0);
  assert.equal(pages.at(-1).bottom, 74000);
  pages.forEach((page, index) => {
    assert.ok(page.bottom > page.top && page.bottom - page.top <= 1000);
    if (index) assert.equal(page.top, pages[index - 1].bottom);
    assert.ok(regions.every(region => !(region.top < page.bottom && region.bottom > page.bottom)));
  });
});

test("invalid dimensions fail rather than looping forever", () => {
  assert.throws(() => paginate(100, 0, []));
  assert.throws(() => paginate(Infinity, 100, []));
});
