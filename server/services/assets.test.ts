import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import type { AssetRecord } from "../domain/types";
import { createAssetService, type AssetRepositoryPort, type AssetStoragePort } from "./assets";

function ports(asset?: AssetRecord) {
  const repository: AssetRepositoryPort = {
    createDraft: vi.fn(),
    getById: vi.fn().mockResolvedValue(asset ?? null),
    complete: vi.fn(),
    findLatestProject: vi.fn(),
    createProject: vi.fn(),
    listActivePresets: vi.fn(),
  };
  const storage: AssetStoragePort = {
    createSignedUploadUrl: vi.fn().mockResolvedValue({
      signedUrl: "https://storage.example/upload",
      token: "token",
    }),
    createSignedUrl: vi.fn(),
    download: vi.fn(),
    upload: vi.fn(),
  };
  return { repository, storage };
}

describe("asset service", () => {
  it("creates product paths internally", async () => {
    const { repository, storage } = ports();
    const service = createAssetService({
      repository,
      storage,
      bucket: "carpet-assets",
      createId: () => "00000000-0000-4000-8000-000000000099",
    });

    const result = await service.createUpload({
      projectId: "00000000-0000-4000-8000-000000000001",
      kind: "product",
      filename: "ignored-name.png",
      mimeType: "image/png",
      byteSize: 1024,
    });

    expect(result.objectPath).toBe("products/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000099.png");
    expect(repository.createDraft).toHaveBeenCalledWith(expect.objectContaining({
      id: "00000000-0000-4000-8000-000000000099",
      kind: "product",
      byteSize: 1024,
    }));
  });

  it("verifies and records actual image metadata", async () => {
    const asset: AssetRecord = {
      id: "00000000-0000-4000-8000-000000000099",
      projectId: "00000000-0000-4000-8000-000000000001",
      kind: "product",
      bucket: "carpet-assets",
      objectPath: "products/project/asset.png",
      mimeType: "image/png",
      width: null,
      height: null,
      byteSize: null,
    };
    const { repository, storage } = ports(asset);
    const png = await sharp({ create: { width: 12, height: 8, channels: 3, background: "white" } }).png().toBuffer();
    vi.mocked(storage.download).mockResolvedValue(png);
    const service = createAssetService({ repository, storage, bucket: "carpet-assets" });

    await service.completeUpload(asset.id);

    expect(repository.complete).toHaveBeenCalledWith(asset.id, expect.objectContaining({
      mimeType: "image/png",
      width: 12,
      height: 8,
      byteSize: png.byteLength,
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
  });
});
