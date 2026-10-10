import fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import type { GenerationInput } from "../domain/types";
import type { GenerationJobService } from "./generation-jobs";
import type {
  GenerationRunnerAssets,
  GenerationRunnerRepository,
  GenerationRunnerStorage,
} from "./generation-runner";

const DEFAULT_OUTPUT_DIR = path.resolve("tmp/chatgpt-prototype");

function browserPrompt(originalPrompt: string) {
  return [
    "这是一张已经完成粗合成的地毯客厅主图。",
    "请只做画面融合和电商级润色：优化地毯与地面的透视、接触阴影、光线方向、色温、边缘自然度和整体真实感。",
    "不要更换地毯款式，不要改变地毯主要颜色和图案，不要添加文字、水印、价格、标签或人物。",
    "输出一张 1:1 真实电商主图。",
    "",
    "原始业务提示词：",
    originalPrompt,
  ].join("\n");
}

async function compositeForChatgpt(productBytes: Uint8Array, sceneBytes: Uint8Array) {
  const sceneBase = await sharp(sceneBytes, { failOn: "none" })
    .rotate()
    .resize(1024, 1024, { fit: "cover" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const rug = await sharp(productBytes, { failOn: "none" })
    .rotate()
    .resize({
      width: 780,
      height: 390,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const shadow = Buffer.from(
    `<svg width="820" height="430" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="410" cy="360" rx="370" ry="44" fill="black" opacity="0.20"/>
    </svg>`,
  );

  return new Uint8Array(await sharp(sceneBase)
    .composite([
      { input: shadow, left: 102, top: 548 },
      { input: rug, left: 122, top: 570 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer());
}

export function createChatgptPrototypeService(options: {
  jobs: GenerationJobService;
  repository: Pick<GenerationRunnerRepository, "claim" | "succeed">;
  assets: GenerationRunnerAssets;
  storage: GenerationRunnerStorage;
  bucket: string;
  createId?: () => string;
  outputDir?: string;
}) {
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
  const createId = options.createId ?? randomUUID;

  return {
    async prepare(input: GenerationInput) {
      const job = await options.jobs.create(input);
      await options.repository.claim(job.id);

      const [product, scene] = await Promise.all([
        options.assets.download(input.productAssetId),
        options.assets.download(input.sceneAssetId),
      ]);

      const jobDir = path.join(outputDir, job.id);
      await fs.mkdir(jobDir, { recursive: true });
      const inputPath = path.join(jobDir, "chatgpt-input.jpg");
      await fs.writeFile(inputPath, await compositeForChatgpt(product.bytes, scene.bytes));

      return {
        id: job.id,
        status: "processing" as const,
        inputPath,
        prompt: browserPrompt(input.prompt),
      };
    },

    async complete(jobId: string, input: { resultPath: string }) {
      const resolvedResultPath = path.resolve(input.resultPath);
      const resolvedOutputDir = path.resolve(outputDir);
      if (!resolvedResultPath.startsWith(resolvedOutputDir + path.sep)) {
        throw new Error("CHATGPT_RESULT_PATH_OUTSIDE_OUTPUT_DIR");
      }

      const sourceBytes = await fs.readFile(resolvedResultPath);
      const normalizedBytes = new Uint8Array(await sharp(sourceBytes, { failOn: "none" })
        .rotate()
        .resize(1024, 1024, { fit: "cover" })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer());
      const metadata = await sharp(normalizedBytes).metadata();
      if (!metadata.width || !metadata.height) throw new Error("INVALID_CHATGPT_RESULT_IMAGE");

      const resultId = createId();
      const objectPath = `generations/chatgpt-prototype/${jobId}/${resultId}.jpg`;
      await options.storage.upload(objectPath, normalizedBytes, "image/jpeg");
      await options.repository.succeed(jobId, {
        resultId,
        bucket: options.bucket,
        objectPath,
        mimeType: "image/jpeg",
        byteSize: normalizedBytes.byteLength,
        width: metadata.width,
        height: metadata.height,
        sha256: createHash("sha256").update(normalizedBytes).digest("hex"),
        providerRequestId: "chatgpt-web-prototype",
        durationMs: 0,
        costPoints: 0,
      });

      const job = await options.jobs.get(jobId);
      if (!job || job.status !== "succeeded" || !job.resultUrl) {
        throw new Error("CHATGPT_PROTOTYPE_RESULT_NOT_AVAILABLE");
      }
      return {
        id: job.id,
        status: "succeeded" as const,
        resultUrl: job.resultUrl,
      };
    },
  };
}

export type ChatgptPrototypeService = ReturnType<typeof createChatgptPrototypeService>;
