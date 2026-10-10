import { demoAssetUrl } from "./demo-assets";
import type { DemoSceneId } from "./demo-cases";

export type OwnSkuId = "own-1" | "own-2" | "own-3" | "own-4";
export type SceneTone = "light" | "dark";
export const ownSkus = [
  { id: "own-1", label: "SKU 01 · 黑边米白款", name: "自有条纹地毯 · 黑边米白款", features: "两端黑色宽边、米白中部与细密交织纹理" },
  { id: "own-2", label: "SKU 02 · 宽条拼接款", name: "自有条纹地毯 · 宽条拼接款", features: "中部黑色宽条、米白拼接与两端细黑边" },
  { id: "own-3", label: "SKU 03 · 米白细条款", name: "自有条纹地毯 · 米白细条款", features: "米白主体与两端细条纹" },
  { id: "own-4", label: "SKU 04 · 双宽条纹款", name: "自有条纹地毯 · 双宽条纹款", features: "米白底色与靠近两端的黑色双宽条纹" },
].map((sku, index) => ({ ...sku, id: sku.id as OwnSkuId, url: demoAssetUrl(`/demo/user-33/own-sku-${index + 1}.png`) }));

export function getOwnSku(id: OwnSkuId = "own-1") {
  return ownSkus.find((sku) => sku.id === id) ?? ownSkus[0];
}
export const ownAngles: { id: DemoSceneId; number: number; name: string }[] = [
  { id: "cream", number: 1, name: "主图视角" },
  { id: "modern", number: 2, name: "俯视近景" },
  { id: "wood", number: 3, name: "客厅全景" },
];
export const mainReferences: { tone: SceneTone; label: string; url: string; fileName: string }[] = [
  { tone: "light", label: "浅色主图", url: demoAssetUrl("/demo/source-sets/light-reference-1.jpg"), fileName: "db087eba82c8fa0863a03e5ef9d2d2d5.jpg" },
  { tone: "dark", label: "深色主图", url: demoAssetUrl("/demo/source-sets/dark-reference-1.jpg"), fileName: "51eeb958ecee9ce30a3b5d83e4182418.jpg" },
];
export type SceneBatch = 0 | 1;
export function getOwnScene(tone: SceneTone, id: DemoSceneId, batch: SceneBatch = 0) {
  const angle = ownAngles.find((item) => item.id === id)!;
  const number = angle.number + batch * 3;
  const angleName = (tone === "light"
    ? ["主图视角", "俯视近景", "客厅全景", "侧向全景", "斜向全景", "正向纵深"]
    : ["主图视角", "斜向全景", "正向纵深", "窗边斜角", "俯视近景", "客厅全景"])[number - 1];
  const referenceTone = batch === 0 ? tone : tone === "light" ? "dark" : "light";
  const theme = tone === "light" ? "浅色方案" : "深色方案";
  return {
    ...angle, number, batch, angleName, tone, theme, name: `${theme} · ${angleName}`,
    details: tone === "light" ? "奶油浅色家具、浅木陈设与柔和自然光" : "深色家具、深木陈设与有层次的柔和侧光",
    previewUrl: demoAssetUrl(`/demo/source-sets/${tone}-scene-${number}.png`),
    resultUrl: demoAssetUrl(`/demo/source-sets/${tone}-fusion-${number}.png`),
    referenceUrl: demoAssetUrl(`/demo/source-sets/${referenceTone}-reference-${angle.number}.jpg`),
    width: 1254, height: 1254,
  };
}
