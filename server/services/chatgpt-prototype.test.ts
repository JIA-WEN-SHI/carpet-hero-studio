import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationJobService } from "./generation-jobs";
import type { GenerationRunnerRepository } from "./generation-runner";
import type { GenerationRunnerStorage } from "./generation-runner";
import { createChatgptPrototypeService } from "./chatgpt-prototype";

const input = {
  projectId: "00000000-0000-4000-8000-000000000001",
  productAssetId: "00000000-0000-4000-8000-000000000002",
  sceneAssetId: "00000000-0000-4000-8000-000000000003",
  prompt: "第一张产品图替换第二张场景图中的地毯并保留产品细节。",
  parameters: { room: "客厅" },
};

async function image(width: number, height: number, color: string) {
  return new Uint8Array(await sharp({
    create: { width, height, channels: 3, background: color },
  }).jpeg().toBuffer());
}

describe("chatgpt prototype service", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt-prototype-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates a processing job and writes a single composite image for ChatGPT web automation", async () => {
    const jobs = {
      create: vi.fn().mockResolvedValue({ id: "job-1", status: "queued" }),
      get: vi.fn(),
      history: vi.fn(),
      selectResult: vi.fn(),
    } as unknown as GenerationJobService;
    const repository = {
      claim: vi.fn().mockResolvedValue({ id: "job-1" }),
    } as unknown as GenerationRunnerRepository;
    const assets = {
      download: vi.fn()
        .mockResolvedValueOnce({ bytes: await image(800, 500, "#d6b777"), mimeType: "image/jpeg", filename: "rug.jpg" })
        .mockResolvedValueOnce({ bytes: await image(1024, 1024, "#eee7dd"), mimeType: "image/jpeg", filename: "scene.jpg" }),
    };

    const service = createChatgptPrototypeService({
      jobs,
      repository,
      assets,
      storage: { upload: vi.fn() },
      bucket: "carpet-assets",
      createId: () => "00000000-0000-4000-8000-000000000020",
      outputDir: tmpDir,
    });

    const result = await service.prepare(input);

    expect(jobs.create).toHaveBeenCalledWith(input);
    expect(repository.claim).toHaveBeenCalledWith("job-1");
    expect(result).toMatchObject({ id: "job-1", status: "processing" });
    expect(result.prompt).toContain("只做画面融合和电商级润色");
    expect(result.prompt).toContain(input.prompt);
    expect(result.inputPath).toBe(path.join(tmpDir, "job-1", "chatgpt-input.jpg"));

    const metadata = await sharp(result.inputPath).metadata();
    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(1024);
  });

  it("uploads a downloaded ChatGPT result and marks the job succeeded", async () => {
    const resultPath = path.join(tmpDir, "job-1", "chatgpt-result.png");
    await fs.mkdir(path.dirname(resultPath), { recursive: true });
    const resultBytes = await image(1024, 1024, "#ffffff");
    await fs.writeFile(resultPath, resultBytes);
    const jobs = {
      create: vi.fn(),
      get: vi.fn().mockResolvedValue({
        id: "job-1",
        status: "succeeded",
        resultUrl: "https://storage.example/result.png",
      }),
      history: vi.fn(),
      selectResult: vi.fn(),
    } as unknown as GenerationJobService;
    const repository = {
      claim: vi.fn(),
      succeed: vi.fn(),
    } as unknown as GenerationRunnerRepository;
    const storage: GenerationRunnerStorage = { upload: vi.fn() };

    const service = createChatgptPrototypeService({
      jobs,
      repository,
      assets: { download: vi.fn() },
      storage,
      bucket: "carpet-assets",
      createId: () => "00000000-0000-4000-8000-000000000020",
      outputDir: tmpDir,
    });

    const result = await service.complete("job-1", { resultPath });

    expect(storage.upload).toHaveBeenCalledWith(
      "generations/chatgpt-prototype/job-1/00000000-0000-4000-8000-000000000020.jpg",
      expect.any(Uint8Array),
      "image/jpeg",
    );
    expect(repository.succeed).toHaveBeenCalledWith("job-1", expect.objectContaining({
      resultId: "00000000-0000-4000-8000-000000000020",
      bucket: "carpet-assets",
      objectPath: "generations/chatgpt-prototype/job-1/00000000-0000-4000-8000-000000000020.jpg",
      width: 1024,
      height: 1024,
      costPoints: 0,
    }));
    expect(result).toEqual({
      id: "job-1",
      status: "succeeded",
      resultUrl: "https://storage.example/result.png",
    });
  });
});
