import { describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";

describe("API app", () => {
  it("reports health without external services", async () => {
    const app = buildApp({
      assets: { createUpload: vi.fn(), completeUpload: vi.fn() },
      projects: { bootstrap: vi.fn() },
      scenes: { listPresets: vi.fn() },
      prompts: { saveVersion: vi.fn() },
      jobs: { create: vi.fn(), get: vi.fn(), history: vi.fn(), selectResult: vi.fn() },
      schedule: vi.fn(),
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
