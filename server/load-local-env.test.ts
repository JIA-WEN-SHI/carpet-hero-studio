import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadLocalEnv } from "./load-local-env";

const createdDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("loadLocalEnv", () => {
  it("loads .env.local into the provided environment", async () => {
    const directory = await mkdtemp(join(tmpdir(), "carpet-env-"));
    createdDirectories.push(directory);
    await writeFile(
      join(directory, ".env.local"),
      "SUPABASE_URL=https://example.supabase.co\n",
      "utf8",
    );
    const environment: Record<string, string | undefined> = {};

    loadLocalEnv(directory, environment);

    expect(environment.SUPABASE_URL).toBe("https://example.supabase.co");
  });
});
