import type { AssetRecord, ScenePresetRecord, SupportedImageMimeType } from "../domain/types";
import type { SupabaseAdmin } from "../lib/supabase";
import type { AssetRepositoryPort, AssetStoragePort } from "../services/assets";

function mapAsset(row: Record<string, unknown>): AssetRecord {
  return {
    id: String(row.id),
    projectId: row.project_id ? String(row.project_id) : null,
    kind: row.kind as AssetRecord["kind"],
    bucket: String(row.bucket),
    objectPath: String(row.object_path),
    mimeType: row.mime_type as SupportedImageMimeType,
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    byteSize: row.byte_size == null ? null : Number(row.byte_size),
  };
}

function assertData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data == null) throw new Error("SUPABASE_EMPTY_RESULT");
  return data;
}

export function createSupabaseAssetsRepository(supabase: SupabaseAdmin): AssetRepositoryPort {
  return {
    async createDraft(input) {
      const { error } = await supabase.from("assets").insert({
        id: input.id,
        project_id: input.projectId,
        kind: input.kind,
        bucket: input.bucket,
        object_path: input.objectPath,
        mime_type: input.mimeType,
        byte_size: input.byteSize,
      });
      if (error) throw new Error(error.message);
    },

    async getById(id) {
      const { data, error } = await supabase.from("assets").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapAsset(data) : null;
    },

    async complete(id, metadata) {
      const { error } = await supabase.from("assets").update({
        mime_type: metadata.mimeType,
        width: metadata.width,
        height: metadata.height,
        byte_size: metadata.byteSize,
        sha256: metadata.sha256,
      }).eq("id", id);
      if (error) throw new Error(error.message);
    },

    async findLatestProject() {
      const { data, error } = await supabase.from("projects")
        .select("id,name")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? { id: data.id, name: data.name } : null;
    },

    async createProject() {
      const { data, error } = await supabase.from("projects").insert({
        name: "当前首图项目",
        product_name: "待上传产品",
      }).select("id,name").single();
      return assertData(data, error);
    },

    async listActivePresets(limit) {
      const { data, error } = await supabase.from("scene_presets")
        .select("id,name,asset_id,tags,default_parameters,sort_order,asset:assets!scene_presets_asset_id_fkey(*)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const assetRow = Array.isArray(row.asset) ? row.asset[0] : row.asset;
        if (!assetRow) throw new Error("SCENE_PRESET_ASSET_MISSING");
        return {
          id: row.id,
          name: row.name,
          assetId: row.asset_id,
          tags: row.tags ?? [],
          defaultParameters: row.default_parameters ?? {},
          sortOrder: row.sort_order,
          asset: mapAsset(assetRow),
        } satisfies ScenePresetRecord & { asset: AssetRecord };
      });
    },
  };
}

export function createSupabaseAssetStorage(
  supabase: SupabaseAdmin,
  bucket: string,
): AssetStoragePort {
  const storage = supabase.storage.from(bucket);
  return {
    async createSignedUploadUrl(path) {
      const { data, error } = await storage.createSignedUploadUrl(path);
      const value = assertData(data, error);
      return { signedUrl: value.signedUrl, token: value.token };
    },

    async createSignedUrl(path, expiresInSeconds) {
      const { data, error } = await storage.createSignedUrl(path, expiresInSeconds);
      return assertData(data, error).signedUrl;
    },

    async download(path) {
      const { data, error } = await storage.download(path);
      const blob = assertData(data, error);
      return new Uint8Array(await blob.arrayBuffer());
    },

    async upload(path, bytes, mimeType) {
      const { error } = await storage.upload(path, bytes, {
        contentType: mimeType,
        upsert: false,
      });
      if (error) throw new Error(error.message);
    },
  };
}
