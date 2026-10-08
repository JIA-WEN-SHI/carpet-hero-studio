import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./seed-scenes.ts", import.meta.url)),
  "utf8",
);

describe("scene seeding", () => {
  it("is safe to run repeatedly", () => {
    expect(source).toContain("upsert: true");
    expect(source).toContain('.from("assets").upsert(');
    expect(source).toContain('.from("scene_presets").upsert(');
  });
});
