import { Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { listScenePresets } from "./api";
import type { ScenePreset } from "./types";
import { useAssetUpload } from "./useAssetUpload";

export function SceneReferences({
  projectId,
  selectedAssetId,
  onSelect,
}: {
  projectId: string;
  selectedAssetId?: string;
  onSelect(assetId: string, previewUrl: string): void;
}) {
  const [presets, setPresets] = useState<ScenePreset[]>([]);
  const [error, setError] = useState<string>();
  const { upload, uploading } = useAssetUpload();

  useEffect(() => {
    let active = true;
    listScenePresets()
      .then((items) => {
        if (!active) return;
        setPresets(items.slice(0, 3));
        if (!selectedAssetId && items[0]) onSelect(items[0].assetId, items[0].previewUrl);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "推荐场景加载失败");
      });
    return () => { active = false; };
  }, [onSelect, selectedAssetId]);

  const uploadCustom = async (file?: File) => {
    if (!file) return;
    setError(undefined);
    try {
      const assetId = await upload(projectId, "scene_custom", file);
      onSelect(assetId, URL.createObjectURL(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "自定义场景上传失败");
    }
  };

  return (
    <div className="scene-reference-picker">
      <div className="scene-reference-grid">
        {presets.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={selectedAssetId === preset.assetId ? "selected" : ""}
            onClick={() => onSelect(preset.assetId, preset.previewUrl)}
          >
            <img src={preset.previewUrl} alt={preset.name} />
            <span>{preset.name}</span>
          </button>
        ))}
        <label className={`scene-upload-tile ${uploading ? "disabled" : ""}`}>
          {uploading ? <Upload size={20} /> : <Plus size={20} />}
          <span>{uploading ? "上传中" : "自定义"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(event) => { void uploadCustom(event.target.files?.[0]); }}
          />
        </label>
      </div>
      {error && <small className="inline-error">{error}</small>}
    </div>
  );
}
