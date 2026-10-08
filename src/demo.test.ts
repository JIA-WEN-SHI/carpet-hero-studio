import { describe, expect, it, vi } from "vitest";
import { demoRequest, demoProduct } from "./demo";

describe("public demo network boundary", () => {
  it("runs scene selection and job status without calling a real service", async () => {
    const realFetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No network in demo"));
    try {
      const scenes = await (await demoRequest("/api/scene-presets?limit=3")).json();
      expect(scenes).toHaveLength(3);
      expect(decodeURIComponent(demoProduct)).toContain('xmlns="http://www.w3.org/2000/svg"');
      const queued = await (await demoRequest("/api/generation-jobs", { method: "POST", body: JSON.stringify({ sceneAssetId: scenes[1].assetId }) })).json();
      expect(queued.status).toBe("queued");
      const processing = await (await demoRequest(`/api/generation-jobs/${queued.id}`)).json();
      expect(processing.status).toBe("processing");
      const finished = await (await demoRequest(`/api/generation-jobs/${queued.id}`)).json();
      expect(finished.status).toBe("succeeded");
      expect(finished.resultUrl).toBe(scenes[1].previewUrl);
      expect(realFetch).not.toHaveBeenCalled();
    } finally { realFetch.mockRestore(); }
  });

  it("rejects missing jobs and unknown endpoints instead of falling through to the backend", async () => {
    expect((await demoRequest("/api/generation-jobs/missing")).status).toBe(404);
    expect((await demoRequest("https://model.example/api")).status).toBe(400);
  });
});
