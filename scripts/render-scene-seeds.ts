import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";

Object.assign(globalThis, { React });
const { RoomScene } = await import("../src/art");

const outputs = [
  { variant: 0, file: "01-cream-living-room.png" },
  { variant: 1, file: "02-modern-bedroom.png" },
  { variant: 2, file: "03-warm-entryway.png" },
] as const;

const outputDirectory = resolve("seed/scenes");
await mkdir(outputDirectory, { recursive: true });

for (const output of outputs) {
  const markup = renderToStaticMarkup(React.createElement(RoomScene, { variant: output.variant }));
  const png = await sharp(Buffer.from(markup)).resize(1024, 1024, { fit: "cover" }).png().toBuffer();
  await writeFile(resolve(outputDirectory, output.file), png);
  console.log(`Rendered ${output.file}.`);
}
