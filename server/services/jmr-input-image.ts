import path from "node:path";
import sharp from "sharp";
import type { JmrImagePart } from "../providers/jmr-image";

const JMR_INPUT_MAX_DIMENSION = 1024;
const JMR_INPUT_JPEG_QUALITY = 90;

function normalizedFilename(filename: string) {
  const parsed = path.parse(filename);
  const basename = parsed.name || "image";
  return `${basename}-jmr.jpg`;
}

export async function prepareJmrInputImage(part: JmrImagePart): Promise<JmrImagePart> {
  const bytes = await sharp(part.bytes, { failOn: "none" })
    .rotate()
    .resize({
      width: JMR_INPUT_MAX_DIMENSION,
      height: JMR_INPUT_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({
      quality: JMR_INPUT_JPEG_QUALITY,
      mozjpeg: true,
    })
    .toBuffer();

  return {
    bytes: new Uint8Array(bytes),
    mimeType: "image/jpeg",
    filename: normalizedFilename(part.filename),
  };
}
