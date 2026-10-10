import { describe, expect, it } from "vitest";
import {
  getSafeUploadError,
  getSafeUploadMessage,
  MAX_IMAGE_BYTES,
  PRODUCT_IMAGE_ACCEPT,
  UploadValidationError,
  validateImageFile,
} from "./upload-policy";

describe("product image upload policy", () => {
  it("exports the exact accepted MIME types", () => {
    expect(PRODUCT_IMAGE_ACCEPT).toBe("image/jpeg,image/png,image/webp");
  });

  it.each([
    ["image/jpeg", MAX_IMAGE_BYTES],
    ["image/png", 1],
    ["image/webp", 1],
  ])("accepts %s images", (type, size) => {
    expect(() => validateImageFile({ type, size })).not.toThrow();
  });

  it("rejects GIF images", () => {
    expect(() => validateImageFile({ type: "image/gif", size: 1 })).toThrow(
      new UploadValidationError("仅支持 JPG、PNG 和 WebP 图片"),
    );
  });

  it("rejects images over 20 MB", () => {
    expect(() => validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toThrow(
      new UploadValidationError("图片不能超过 20 MB"),
    );
  });

  it("preserves upload validation messages", () => {
    expect(getSafeUploadMessage(new UploadValidationError("图片不能超过 20 MB")))
      .toBe("图片不能超过 20 MB");
  });

  it("hides signed URLs from arbitrary errors", () => {
    const reason = new Error("PUT https://storage.example.com/object?token=secret failed");

    expect(getSafeUploadMessage(reason)).toBe("图片上传失败，请重试");
  });

  it("returns a safe caller-facing error for arbitrary failures", () => {
    const reason = new Error("PUT https://storage.example.com/object?token=secret failed");

    const safeError = getSafeUploadError(reason);

    expect(safeError).not.toBe(reason);
    expect(safeError).toEqual(new Error("图片上传失败，请重试"));
  });

  it("preserves validation errors for callers", () => {
    const reason = new UploadValidationError("仅支持 JPG、PNG 和 WebP 图片");

    expect(getSafeUploadError(reason)).toBe(reason);
  });
});
