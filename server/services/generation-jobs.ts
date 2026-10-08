import type { AssetRecord, GenerationInput, GenerationStatus } from "../domain/types";
import { isSceneAsset } from "./assets";

export interface GenerationJobRepositoryPort {
  create(input: GenerationInput): Promise<{ id: string; status: "queued" }>;
  getView(id: string): Promise<{
    id: string;
    status: GenerationStatus;
    errorMessage?: string;
    resultObjectPath?: string;
  } | null>;
  history(projectId: string): Promise<Array<{
    id: string;
    jobId: string;
    objectPath: string;
    isSelected: boolean;
  }>>;
  selectResult(resultId: string): Promise<void>;
}

export interface GenerationAssetLookup {
  getById(id: string): Promise<AssetRecord | null>;
}

export function createGenerationJobService(options: {
  jobs: GenerationJobRepositoryPort;
  assets: GenerationAssetLookup;
  createSignedUrl(path: string): Promise<string>;
}) {
  return {
    async create(input: GenerationInput) {
      const [product, scene] = await Promise.all([
        options.assets.getById(input.productAssetId),
        options.assets.getById(input.sceneAssetId),
      ]);
      if (!product || product.kind !== "product" || !product.width || product.projectId !== input.projectId) {
        throw new Error("INVALID_PRODUCT_ASSET");
      }
      if (!scene || !isSceneAsset(scene.kind) || !scene.width) {
        throw new Error("INVALID_SCENE_ASSET");
      }
      if (scene.kind === "scene_custom" && scene.projectId !== input.projectId) {
        throw new Error("INVALID_SCENE_ASSET");
      }
      return options.jobs.create(input);
    },

    async get(id: string) {
      const job = await options.jobs.getView(id);
      if (!job) return null;
      return {
        id: job.id,
        status: job.status,
        errorMessage: job.errorMessage,
        resultUrl: job.resultObjectPath
          ? await options.createSignedUrl(job.resultObjectPath)
          : undefined,
      };
    },

    async history(projectId: string) {
      const rows = await options.jobs.history(projectId);
      return Promise.all(rows.map(async (row) => ({
        id: row.id,
        jobId: row.jobId,
        resultUrl: await options.createSignedUrl(row.objectPath),
        isSelected: row.isSelected,
      })));
    },

    async selectResult(resultId: string) {
      await options.jobs.selectResult(resultId);
    },
  };
}

export type GenerationJobService = ReturnType<typeof createGenerationJobService>;
