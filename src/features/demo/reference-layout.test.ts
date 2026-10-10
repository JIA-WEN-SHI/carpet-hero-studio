import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

it("原始案例缩略图按1:1居中铺满，不留竖图边框", () => {
  const css = readFileSync(resolve("src/features/demo/demo.css"), "utf8");
  const rule = css.match(/\.demo-original-reference\s*>\s*img\s*\{([^}]+)\}/)?.[1];
  expect(rule).toMatch(/aspect-ratio:\s*1\s*;/);
  expect(rule).toMatch(/object-fit:\s*cover\s*;/);
  expect(rule).toMatch(/object-position:\s*center\s*;/);
});
