import { useCallback, useState } from "react";
import { completeUpload, createUpload, uploadSignedFile } from "./api";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function useAssetUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const upload = useCallback(async (
    projectId: string,
    kind: "product" | "scene_custom",
    file: File,
  ) => {
    if (!acceptedTypes.has(file.type)) throw new Error("仅支持 JPG、PNG 和 WebP 图片");
    if (file.size > 20 * 1024 * 1024) throw new Error("图片不能超过 20 MB");
    setUploading(true);
    setError(undefined);
    try {
      const signed = await createUpload({
        projectId,
        kind,
        filename: file.name,
        mimeType: file.type,
        byteSize: file.size,
      });
      await uploadSignedFile(signed.uploadUrl, file);
      await completeUpload(signed.assetId);
      return signed.assetId;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "图片上传失败";
      setError(message);
      throw reason;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error, clearError: () => setError(undefined) };
}
