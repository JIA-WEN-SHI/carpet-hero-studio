import { useCallback, useState } from "react";
import { completeUpload, createUpload, uploadSignedFile } from "./api";
import { getSafeUploadError, validateImageFile } from "./upload-policy";

export function useAssetUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const upload = useCallback(async (
    projectId: string,
    kind: "product" | "scene_custom",
    file: File,
  ) => {
    setUploading(true);
    setError(undefined);
    try {
      validateImageFile(file);
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
      const safeError = getSafeUploadError(reason);
      setError(safeError.message);
      throw safeError;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error, clearError: () => setError(undefined) };
}
