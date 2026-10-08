import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import sharp from "sharp";
import { createSupabaseAdmin } from "../server/lib/supabase";
import { loadConfig } from "../server/config";
import { loadLocalEnv } from "../server/load-local-env";

const scenes = [
  { file: "01-cream-living-room.png", name: "奶油风客厅", tags: ["客厅", "奶油风"], assetId: "00000000-0000-4000-8000-000000000201", presetId: "00000000-0000-4000-8000-000000000301" },
  { file: "02-modern-bedroom.png", name: "现代浅色空间", tags: ["浅色", "现代简约"], assetId: "00000000-0000-4000-8000-000000000202", presetId: "00000000-0000-4000-8000-000000000302" },
  { file: "03-warm-entryway.png", name: "暖木色空间", tags: ["暖木", "自然"], assetId: "00000000-0000-4000-8000-000000000203", presetId: "00000000-0000-4000-8000-000000000303" },
] as const;

async function validateFiles() {
  return Promise.all(scenes.map(async (scene) => {
    const filePath = resolve("seed/scenes", scene.file);
    const bytes = await readFile(filePath);
    if (bytes.byteLength > 20 * 1024 * 1024) throw new Error(`${scene.file} 超过 20 MB`);
    const metadata = await sharp(bytes).metadata();
    if (metadata.format !== "png" || !metadata.width || metadata.width !== metadata.height) {
      throw new Error(`${scene.file} 必须是 1:1 PNG`);
    }
    return {
      ...scene,
      filePath,
      bytes,
      width: metadata.width,
      height: metadata.height,
      byteSize: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }));
}

const validated = await validateFiles();
if (process.argv.includes("--check")) {
  console.log(`Validated ${validated.length} scene files.`);
  process.exit(0);
}

const config = loadConfig(loadLocalEnv());
const supabase = createSupabaseAdmin(config);
for (const [index, scene] of validated.entries()) {
  const sortOrder = index + 1;
  const existingPreset = await supabase
    .from("scene_presets")
    .select("id, asset_id")
    .eq("sort_order", sortOrder)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingPreset.error) throw new Error(existingPreset.error.message);

  const assetId = existingPreset.data?.asset_id ?? scene.assetId;
  const presetId = existingPreset.data?.id ?? scene.presetId;
  let objectPath = `scenes/presets/${scene.file}`;
  if (existingPreset.data) {
    const existingAsset = await supabase
      .from("assets")
      .select("object_path")
      .eq("id", assetId)
      .single();
    if (existingAsset.error) throw new Error(existingAsset.error.message);
    objectPath = existingAsset.data.object_path;
  }

  const upload = await supabase.storage.from(config.storageBucket).upload(objectPath, scene.bytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (upload.error) throw new Error(upload.error.message);
  const asset = await supabase.from("assets").upsert({
    id: assetId,
    project_id: null,
    kind: "scene_preset",
    bucket: config.storageBucket,
    object_path: objectPath,
    mime_type: "image/png",
    width: scene.width,
    height: scene.height,
    byte_size: scene.byteSize,
    sha256: scene.sha256,
  }, { onConflict: "id" }).select("id").single();
  if (asset.error) throw new Error(asset.error.message);
  const preset = await supabase.from("scene_presets").upsert({
    id: presetId,
    name: scene.name,
    asset_id: assetId,
    tags: scene.tags,
    default_parameters: {},
    sort_order: sortOrder,
    is_active: true,
  }, { onConflict: "id" });
  if (preset.error) throw new Error(preset.error.message);
  console.log(`Uploaded ${basename(scene.filePath)}.`);
}
