import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(new URL("./202607030001_scene_generation.sql", import.meta.url)),
  "utf8",
).toLowerCase();

const publicTables = [
  "projects",
  "assets",
  "scene_presets",
  "prompt_templates",
  "prompt_template_versions",
  "generation_jobs",
  "generation_results",
];

describe("scene generation migration security", () => {
  it("enables row-level security on every public table", () => {
    for (const table of publicTables) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });

  it("indexes foreign keys used for ownership and asset lookups", () => {
    for (const index of [
      "assets_project_id_idx",
      "prompt_templates_active_version_id_idx",
      "generation_jobs_product_asset_id_idx",
      "generation_jobs_scene_asset_id_idx",
      "generation_jobs_prompt_template_version_id_idx",
    ]) {
      expect(migration).toContain(`create index ${index}`);
    }
  });

  it("reserves one row for each recommended scene position", () => {
    expect(migration).toContain(
      "create unique index scene_presets_sort_order_unique_idx",
    );
  });
});
