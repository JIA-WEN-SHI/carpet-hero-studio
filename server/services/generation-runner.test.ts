import { describe, expect, it, vi } from "vitest";
import type { JmrImageProvider } from "../providers/jmr-image";
import {
  createGenerationRunner,
  type GenerationJobRecord,
  type GenerationRunnerRepository,
  type GenerationRunnerStorage,
} from "./generation-runner";

const queuedJob: GenerationJobRecord = {
  id: "00000000-0000-4000-8000-000000000010",
  projectId: "00000000-0000-4000-8000-000000000001",
  productAssetId: "00000000-0000-4000-8000-000000000002",
  sceneAssetId: "00000000-0000-4000-8000-000000000003",
  promptSnapshot: "第一张产品图替换第二张场景图里的地毯，并保留全部产品细节。",
  status: "queued",
};

const validPng = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=",
  "base64",
));

function setup(overrides?: { claim?: GenerationJobRecord | null; editError?: Error; outputBytes?: Uint8Array }) {
  const repository: GenerationRunnerRepository = {
    claim: vi.fn().mockResolvedValue(overrides?.claim === undefined ? queuedJob : overrides.claim),
    succeed: vi.fn(),
    fail: vi.fn(),
    listQueued: vi.fn().mockResolvedValue([]),
  };
  const assets = {
    download: vi.fn()
      .mockResolvedValueOnce({ bytes: validPng, mimeType: "image/png", filename: "product.png" })
      .mockResolvedValueOnce({ bytes: validPng, mimeType: "image/png", filename: "scene.png" }),
  };
  const provider: JmrImageProvider = {
    edit: overrides?.editError
      ? vi.fn().mockRejectedValue(overrides.editError)
      : vi.fn().mockResolvedValue({ bytes: overrides?.outputBytes ?? validPng, mimeType: "image/png", requestId: "req-1" }),
  };
  const storage: GenerationRunnerStorage = { upload: vi.fn() };
  const runner = createGenerationRunner({
    repository,
    assets,
    provider,
    storage,
    bucket: "carpet-assets",
    costPoints: 2.8,
    createId: () => "00000000-0000-4000-8000-000000000020",
    now: () => 1000,
  });
  return { runner, repository, assets, provider, storage };
}

describe("generation runner", () => {
  it("moves a claimed job to success and preserves image order", async () => {
    const { runner, repository, assets, provider, storage } = setup();

    await runner.run(queuedJob.id);

    expect(assets.download).toHaveBeenNthCalledWith(1, queuedJob.productAssetId);
    expect(assets.download).toHaveBeenNthCalledWith(2, queuedJob.sceneAssetId);
    expect(provider.edit).toHaveBeenCalledWith(expect.objectContaining({
      product: expect.objectContaining({ filename: "product-jmr.jpg", mimeType: "image/jpeg" }),
      scene: expect.objectContaining({ filename: "scene-jmr.jpg", mimeType: "image/jpeg" }),
      prompt: queuedJob.promptSnapshot,
    }));
    expect(storage.upload).toHaveBeenCalledOnce();
    expect(repository.succeed).toHaveBeenCalledWith(queuedJob.id, expect.objectContaining({
      resultId: "00000000-0000-4000-8000-000000000020",
      providerRequestId: "req-1",
      costPoints: 2.8,
      width: 1,
      height: 1,
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(repository.fail).not.toHaveBeenCalled();
  });

  it("stores a safe failure without retrying", async () => {
    const { runner, repository, provider } = setup({ editError: new Error("Bearer secret-value upstream failed") });

    await runner.run(queuedJob.id);

    expect(provider.edit).toHaveBeenCalledOnce();
    expect(repository.succeed).not.toHaveBeenCalled();
    expect(repository.fail).toHaveBeenCalledWith(queuedJob.id, expect.objectContaining({
      code: "GENERATION_FAILED",
      message: expect.not.stringContaining("secret-value"),
    }));
  });

  it("does nothing when the job cannot be claimed", async () => {
    const { runner, provider, repository } = setup({ claim: null });

    await runner.run(queuedJob.id);

    expect(provider.edit).not.toHaveBeenCalled();
    expect(repository.succeed).not.toHaveBeenCalled();
    expect(repository.fail).not.toHaveBeenCalled();
  });

  it("fails without uploading when the provider result is not an image", async () => {
    const { runner, repository, storage } = setup({ outputBytes: new Uint8Array([9, 8, 7]) });

    await runner.run(queuedJob.id);

    expect(storage.upload).not.toHaveBeenCalled();
    expect(repository.succeed).not.toHaveBeenCalled();
    expect(repository.fail).toHaveBeenCalledOnce();
  });
});
