export type AssetKind =
  | "product"
  | "scene_preset"
  | "scene_custom"
  | "generation_result";

export type GenerationStatus = "queued" | "processing" | "succeeded" | "failed";

export type SupportedImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface AssetRecord {
  id: string;
  projectId: string | null;
  kind: AssetKind;
  bucket: string;
  objectPath: string;
  mimeType: SupportedImageMimeType;
  width: number | null;
  height: number | null;
  byteSize: number | null;
}

export interface GenerationInput {
  projectId: string;
  productAssetId: string;
  sceneAssetId: string;
  prompt: string;
  parameters: Record<string, unknown>;
}

export interface ScenePresetRecord {
  id: string;
  name: string;
  assetId: string;
  tags: string[];
  defaultParameters: Record<string, unknown>;
  sortOrder: number;
}
