import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import type {
  AssetKind,
  AssetRecord,
  ScenePresetRecord,
  SupportedImageMimeType,
} from "../domain/types";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const extensionByMime: Record<SupportedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const mimeByFormat: Record<string, SupportedImageMimeType | undefined> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export interface AssetRepositoryPort {
  createDraft(input: {
    id: string;
    projectId: string;
    kind: "product" | "scene_custom";
    bucket: string;
    objectPath: string;
    mimeType: SupportedImageMimeType;
    byteSize: number;
  }): Promise<void>;
  getById(id: string): Promise<AssetRecord | null>;
  complete(id: string, metadata: {
    mimeType: SupportedImageMimeType;
    width: number;
    height: number;
    byteSize: number;
    sha256: string;
  }): Promise<void>;
  findLatestProject(): Promise<{ id: string; name: string } | null>;
  createProject(): Promise<{ id: string; name: string }>;
  listActivePresets(limit: number): Promise<Array<ScenePresetRecord & { asset: AssetRecord }>>;
}

export interface AssetStoragePort {
  createSignedUploadUrl(path: string): Promise<{ signedUrl: string; token: string }>;
  createSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  download(path: string): Promise<Uint8Array>;
  upload(path: string, bytes: Uint8Array, mimeType: string): Promise<void>;
}

export function createAssetService(options: {
  repository: AssetRepositoryPort;
  storage: AssetStoragePort;
  bucket: string;
  createId?: () => string;
}) {
  const createId = options.createId ?? randomUUID;

  return {
    async bootstrap() {
      return (await options.repository.findLatestProject()) ?? options.repository.createProject();
    },

    async createUpload(input: {
      projectId: string;
      kind: "product" | "scene_custom";
      filename: string;
      mimeType: SupportedImageMimeType;
      byteSize: number;
    }) {
      if (input.byteSize > MAX_IMAGE_BYTES) {
        throw new Error("IMAGE_TOO_LARGE");
      }
      const assetId = createId();
      const directory = input.kind === "product" ? "products" : "scenes/custom";
      const extension = extensionByMime[input.mimeType];
      const objectPath = `${directory}/${input.projectId}/${assetId}.${extension}`;
      await options.repository.createDraft({
        id: assetId,
        projectId: input.projectId,
        kind: input.kind,
        bucket: options.bucket,
        objectPath,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
      });
      const signed = await options.storage.createSignedUploadUrl(objectPath);
      return {
        assetId,
        uploadUrl: signed.signedUrl,
        token: signed.token,
        objectPath,
      };
    },

    async completeUpload(assetId: string) {
      const asset = await options.repository.getById(assetId);
      if (!asset) throw new Error("ASSET_NOT_FOUND");
      const bytes = await options.storage.download(asset.objectPath);
      if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("IMAGE_TOO_LARGE");
      const metadata = await sharp(bytes).metadata();
      const mimeType = metadata.format ? mimeByFormat[metadata.format] : undefined;
      if (!mimeType || mimeType !== asset.mimeType || !metadata.width || !metadata.height) {
        throw new Error("INVALID_IMAGE_CONTENT");
      }
      await options.repository.complete(assetId, {
        mimeType,
        width: metadata.width,
        height: metadata.height,
        byteSize: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    },

    async download(assetId: string) {
      const asset = await options.repository.getById(assetId);
      if (!asset || !asset.width || !asset.height) throw new Error("ASSET_NOT_READY");
      return {
        bytes: await options.storage.download(asset.objectPath),
        mimeType: asset.mimeType,
        filename: asset.objectPath.split("/").at(-1) ?? `${asset.id}.png`,
      };
    },

    async listPresets(limit: number) {
      const rows = await options.repository.listActivePresets(Math.min(limit, 3));
      return Promise.all(rows.map(async (row) => ({
        id: row.id,
        name: row.name,
        assetId: row.assetId,
        previewUrl: await options.storage.createSignedUrl(row.asset.objectPath, 3600),
        tags: row.tags,
      })));
    },
  };
}

export type AssetService = ReturnType<typeof createAssetService>;

export function isSceneAsset(kind: AssetKind): boolean {
  return kind === "scene_preset" || kind === "scene_custom";
}
