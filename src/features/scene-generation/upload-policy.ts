export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const acceptedTypes = new Set(PRODUCT_IMAGE_ACCEPT.split(","));

export class UploadValidationError extends Error {
  override name = "UploadValidationError";
}

export function validateImageFile(file: Pick<File, "type" | "size">) {
  if (!acceptedTypes.has(file.type)) {
    throw new UploadValidationError("仅支持 JPG、PNG 和 WebP 图片");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadValidationError("图片不能超过 20 MB");
  }
}

export function getSafeUploadMessage(reason: unknown) {
  return getSafeUploadError(reason).message;
}

export function getSafeUploadError(reason: unknown): Error {
  return reason instanceof UploadValidationError
    ? reason
    : new Error("图片上传失败，请重试");
}
