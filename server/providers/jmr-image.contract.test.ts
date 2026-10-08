import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createJmrImageProvider } from "./jmr-image";

const enabled = process.env.ENABLE_JMR_CONTRACT_TEST === "true";
const contract = enabled ? describe : describe.skip;

contract("JMR image edit contract", () => {
  it("accepts one product image and one scene image", async () => {
    const apiKey = process.env.JMR_API_KEY;
    const scenePath = process.env.JMR_CONTRACT_SCENE_PATH;
    if (!apiKey || !scenePath) {
      throw new Error("JMR_API_KEY and JMR_CONTRACT_SCENE_PATH are required");
    }

    const productSvg = Buffer.from(`
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="1024" height="1024" fill="#f5f0e8"/>
        <rect x="152" y="232" width="720" height="560" rx="18" fill="#cdb99f" stroke="#7f6b55" stroke-width="18"/>
        <path d="M180 280 L840 740 M180 420 L700 780 M320 240 L860 620" stroke="#5f776b" stroke-width="28" opacity=".8"/>
      </svg>
    `);
    const product = await sharp(productSvg).png().toBuffer();
    const scene = await sharp(scenePath).png().toBuffer();
    const provider = createJmrImageProvider({
      baseUrl: process.env.JMR_BASE_URL || "https://jmrai.net/v1",
      apiKey,
      proxyUrl: process.env.JMR_PROXY_URL,
      timeoutMs: 180_000,
    });

    const result = await provider.edit({
      product: { bytes: product, mimeType: "image/png", filename: "product.png" },
      scene: { bytes: scene, mimeType: "image/png", filename: "scene.png" },
      prompt: "第一张图是产品地毯，第二张图是客厅场景。用第一张图的地毯替换第二张图中的地毯，保留产品图案与颜色，不生成任何文字或水印。",
    });

    expect(result.bytes.byteLength).toBeGreaterThan(10_000);
    const outputDir = resolve("tmp/jmr-contract");
    await mkdir(outputDir, { recursive: true });
    await writeFile(resolve(outputDir, "result.png"), result.bytes);
  }, 200_000);
});
