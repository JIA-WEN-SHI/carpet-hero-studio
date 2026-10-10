import { demoAssetUrl } from "./demo-assets";
import { mainReferences, ownAngles, getOwnScene } from "./own-products";

export type DemoCaseId = "33" | "22";
export type DemoSceneId = "cream" | "modern" | "wood";

export interface DemoCaseData {
  id: DemoCaseId;
  label: string;
  name: string;
  store: string;
  price: string;
  sku: string;
  productUrl: string;
  productLabel: string;
  direction: string;
  owner: string;
  source: string;
  features: string;
  preserve: string[];
  checks: string[];
  reason: string;
  defaultSceneId: DemoSceneId;
  resultUrl: string;
  width: number;
  height: number;
  images: { url: string; label: string }[];
  scenes: { id: DemoSceneId; name: string; style: string; previewUrl: string; details: string }[];
}

export const demoCases: DemoCaseData[] = [
  {
    id: "33", label: "33 · 自有SKU", name: "自有条纹地毯 · 黑边米白款",
    store: "自有地毯店铺（模拟）", price: "¥199.00（模拟价格）", sku: "DEMO-33-OWN",
    productUrl: demoAssetUrl("/demo/user-33/own-sku-1.png"), productLabel: "自己的 SKU 产品图", source: "33 / 自己slku、22 / 所有主图案例", owner: "运营 小周 · 设计 小林（模拟）",
    direction: "将自己的地毯样式融入选定场景。按参考图锁定地毯角度、位置和透视，统一家具风格，输出无字的 1:1 主图。",
    features: "两端黑色宽边 / 米白中部 / 细密交织纹理",
    preserve: ["黑白条纹分布", "交织纹理", "原有比例", "长方形形状"],
    checks: ["黑色宽边与米白中部的分布正确", "保留地毯原有纹理与颜色", "保留原图中地毯的长方形形状"],
    reason: "用自有地毯样式测试深色、浅色两套统一家具场景，在三个参考角度下展示铺设效果。",
    defaultSceneId: "cream", resultUrl: demoAssetUrl("/demo/source-sets/light-fusion-1.png"), width: 1254, height: 1254,
    images: [
      ...mainReferences,
      { url: demoAssetUrl("/demo/user-33/sku-1.jpg"), label: "浅茶色 · 意式复古" },
      { url: demoAssetUrl("/demo/user-33/sku-2.jpg"), label: "凯撒白 · 原木风" },
      { url: demoAssetUrl("/demo/user-33/sku-3.jpg"), label: "古陶棕 · 侘寂风" },
    ],
    scenes: ownAngles.map(angle => { const scene = getOwnScene("light", angle.id); return { id: angle.id, name: scene.name, style: scene.theme, previewUrl: scene.previewUrl, details: scene.details }; }),
  },
  {
    id: "22", label: "22 · 深古木", name: "原纱浮雕双层地毯 · 深古木",
    store: "SAIBOSI 素材案例（店铺信息模拟）", price: "¥229.00（模拟价格）", sku: "DEMO-22-WOOD",
    productUrl: demoAssetUrl("/demo/user-22/sku-1.jpg"), productLabel: "原始 SKU 图", source: "22 / 手机端主图、手淘_SKU", owner: "运营 小周 · 设计 小林（模拟）",
    direction: "保留深古木配色与浮雕纹理，在中古风客厅中突出地毯质感，搭配木质家具和柔和自然光。",
    features: "深古木配色 / 米棕交织的浮雕肌理 / 可拆洗双层结构",
    preserve: ["深古木配色", "米棕浮雕肌理", "双层结构", "长方形形状"],
    checks: ["深古木配色与米棕浮雕肌理清晰", "保留可拆洗地毯的双层结构", "地毯边缘完整，长方形形状正确"],
    reason: "米棕交织的原纱纹理适合中古风与原木空间。通过书墙、休闲椅和自然光展示地毯质感与家居搭配。",
    defaultSceneId: "wood", resultUrl: demoAssetUrl("/demo/user-22/main-3.jpg"), width: 1440, height: 1440,
    images: [
      ...[1, 2, 3, 4, 5].map((i) => ({ url: demoAssetUrl(`/demo/user-22/main-${i}.jpg`), label: `原主图 ${i}` })),
      { url: demoAssetUrl("/demo/user-22/sku-1.jpg"), label: "深古木 · 中古风" },
      { url: demoAssetUrl("/demo/user-22/sku-2.jpg"), label: "浅原木 · 原木风" },
    ],
    scenes: [
      { id: "cream", name: "奶油风沙发区", style: "奶油风", previewUrl: demoAssetUrl("/demo/user-22/sku-1.jpg"), details: "米白织物沙发 · 暖色抱枕 · 柔和自然光" },
      { id: "modern", name: "浅原木客厅", style: "原木风", previewUrl: demoAssetUrl("/demo/user-22/sku-2.jpg"), details: "浅色电视柜 · 米白沙发 · 黑色屏幕 · 原木装饰" },
      { id: "wood", name: "中古风书墙客厅", style: "中古风", previewUrl: demoAssetUrl("/demo/user-22/main-3.jpg"), details: "木质书墙 · 米白休闲椅 · 陶艺摆件 · 侧面自然光" },
    ],
  },
];

export function getDemoCase(id: DemoCaseId = "33") {
  return demoCases.find((item) => item.id === id)!;
}
