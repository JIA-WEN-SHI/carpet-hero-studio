import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import type { GenerationStatus } from "../domain/types";
import { sanitizeError } from "../lib/sanitize-error";
import type { JmrImageProvider } from "../providers/jmr-image";

export interface GenerationJobRecord {
  id: string;
  projectId: string;
  productAssetId: string;
  sceneAssetId: string;
  promptSnapshot: string;
  status: GenerationStatus;
}

export interface GenerationRunnerRepository {
  claim(jobId: string): Promise<GenerationJobRecord | null>;
  succeed(jobId: string, input: {
    resultId: string;
    bucket: string;
    objectPath: string;
    mimeType: string;
    byteSize: number;
    width: number;
    height: number;
    sha256: string;
    providerRequestId?: string;
    durationMs: number;
    costPoints: number;
  }): Promise<void>;
  fail(jobId: string, input: { code: string; message: string; durationMs: number }): Promise<void>;
  listQueued(): Promise<string[]>;
}

export interface GenerationRunnerAssets {
  download(assetId: string): Promise<{ bytes: Uint8Array; mimeType: string; filename: string }>;
}

export interface GenerationRunnerStorage {
  upload(path: string, bytes: Uint8Array, mimeType: string): Promise<void>;
}

export function createGenerationRunner(options: {
  repository: GenerationRunnerRepository;
  assets: GenerationRunnerAssets;
  provider: JmrImageProvider;
  storage: GenerationRunnerStorage;
  bucket: string;
  costPoints: number;
  createId?: () => string;
  now?: () => number;
}) {
  const createId = options.createId ?? randomUUID;
  const now = options.now ?? Date.now;

  async function run(jobId: string) {
    const job = await options.repository.claim(jobId);
    if (!job) return;
    const startedAt = now();
    try {
      const product = await options.assets.download(job.productAssetId);
      const scene = await options.assets.download(job.sceneAssetId);
      const output = await options.provider.edit({ product, scene, prompt: job.promptSnapshot });
      const metadata = await sharp(output.bytes).metadata();
      if (!metadata.width || !metadata.height || !metadata.format || !["png", "jpeg", "webp"].includes(metadata.format)) {
        throw new Error("INVALID_GENERATED_IMAGE");
      }
      const mimeType = metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
      const extension = metadata.format === "jpeg" ? "jpg" : metadata.format;
      const resultId = createId();
      const objectPath = `generations/${job.projectId}/${job.id}/${resultId}.${extension}`;
      await options.storage.upload(objectPath, output.bytes, mimeType);
      await options.repository.succeed(job.id, {
        resultId,
        bucket: options.bucket,
        objectPath,
        mimeType,
        byteSize: output.bytes.byteLength,
        width: metadata.width,
        height: metadata.height,
        sha256: createHash("sha256").update(output.bytes).digest("hex"),
        providerRequestId: output.requestId,
        durationMs: Math.max(0, now() - startedAt),
        costPoints: options.costPoints,
      });
    } catch (error) {
      await options.repository.fail(job.id, {
        ...sanitizeError(error),
        durationMs: Math.max(0, now() - startedAt),
      });
    }
  }

  return {
    run,
    async recoverQueued() {
      for (const jobId of await options.repository.listQueued()) {
        await run(jobId);
      }
    },
  };
}

export type GenerationRunner = ReturnType<typeof createGenerationRunner>;
