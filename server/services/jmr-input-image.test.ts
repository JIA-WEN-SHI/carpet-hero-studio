import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareJmrInputImage } from "./jmr-input-image";

async function createPng(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 226, g: 219, b: 205 },
    },
  }).png().toBuffer();
}

describe("prepareJmrInputImage", () => {
  it("downscales large uploads before sending them to the image model", async () => {
    const original = await createPng(1600, 1200);

    const result = await prepareJmrInputImage({
      bytes: new Uint8Array(original),
      mimeType: "image/png",
      filename: "product.png",
    });

    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.width).toBeLessThanOrEqual(1024);
    expect(metadata.height).toBeLessThanOrEqual(1024);
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.filename).toBe("product-jmr.jpg");
    expect(result.bytes.byteLength).toBeLessThan(original.byteLength);
  });

  it("does not enlarge small uploads while normalizing format", async () => {
    const original = await createPng(640, 480);

    const result = await prepareJmrInputImage({
      bytes: new Uint8Array(original),
      mimeType: "image/png",
      filename: "scene.png",
    });

    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.width).toBe(640);
    expect(metadata.height).toBe(480);
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.filename).toBe("scene-jmr.jpg");
  });
});
