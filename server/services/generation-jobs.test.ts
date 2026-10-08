import { describe, expect, it, vi } from "vitest";
import type { AssetRecord } from "../domain/types";
import { createGenerationJobService, type GenerationJobRepositoryPort } from "./generation-jobs";

const product: AssetRecord = {
  id: "00000000-0000-4000-8000-000000000002",
  projectId: "00000000-0000-4000-8000-000000000001",
  kind: "product",
  bucket: "carpet-assets",
  objectPath: "products/rug.png",
  mimeType: "image/png",
  width: 100,
  height: 100,
  byteSize: 1000,
};
const scene: AssetRecord = { ...product, id: "00000000-0000-4000-8000-000000000003", kind: "scene_preset", projectId: null };

function repository(): GenerationJobRepositoryPort {
  return {
    create: vi.fn().mockResolvedValue({ id: "job-1", status: "queued" }),
    getView: vi.fn(),
    history: vi.fn().mockResolvedValue([]),
    selectResult: vi.fn(),
  };
}

describe("generation job service", () => {
  it("validates product and scene roles before creating a job", async () => {
    const jobs = repository();
    const assets = { getById: vi.fn().mockResolvedValueOnce(product).mockResolvedValueOnce(scene) };
    const service = createGenerationJobService({ jobs, assets, createSignedUrl: vi.fn() });

    await service.create({
      projectId: product.projectId!,
      productAssetId: product.id,
      sceneAssetId: scene.id,
      prompt: "第一张产品图替换第二张场景图里的地毯并保留产品细节。",
      parameters: {},
    });

    expect(jobs.create).toHaveBeenCalledOnce();
  });

  it("rejects a non-product first image", async () => {
    const jobs = repository();
    const assets = { getById: vi.fn().mockResolvedValueOnce(scene).mockResolvedValueOnce(product) };
    const service = createGenerationJobService({ jobs, assets, createSignedUrl: vi.fn() });

    await expect(service.create({
      projectId: product.projectId!,
      productAssetId: scene.id,
      sceneAssetId: product.id,
      prompt: "第一张产品图替换第二张场景图里的地毯并保留产品细节。",
      parameters: {},
    })).rejects.toThrow("INVALID_PRODUCT_ASSET");
    expect(jobs.create).not.toHaveBeenCalled();
  });
});
