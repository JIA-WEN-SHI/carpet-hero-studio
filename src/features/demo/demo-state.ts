import { demoAssetUrl } from "./demo-assets";
import { z } from "zod";
import type { WorkbenchStep } from "../../workflow";
import { getDemoCase, type DemoCaseId } from "./demo-cases";
import { getOwnSku, getOwnScene, mainReferences, ownAngles, type OwnSkuId, type SceneTone } from "./own-products";
export { demoCases } from "./demo-cases";

export const DEMO_STORAGE_KEY = "carpet-hero-user-images-v2";
export const demoCase = getDemoCase();
export const demoScenes = demoCase.scenes;

const resultSchema = z.object({
  id: z.string(), productName: z.string(), sceneId: z.enum(["cream", "modern", "wood"]),
  sceneName: z.string(), prompt: z.string(), imageUrl: z.string(), createdAt: z.string(),
  brightness: z.number().min(-20).max(20),
  caseId: z.enum(["33", "22"]).default("33"),
  width: z.number().positive().default(1440), height: z.number().positive().default(1920),
  skuId: z.enum(["own-1", "own-2", "own-3", "own-4"]).optional(),
  tone: z.enum(["light", "dark"]).optional(),
  productImageUrl: z.string().optional(), sceneImageUrl: z.string().optional(), scenePrompt: z.string().optional(),
  mainReferenceUrl: z.string().optional(),
});
const stateSchema = z.object({
  version: z.literal(1), step: z.enum(["import", "process", "scene", "adjust"]),
  productName: z.string(), direction: z.string(), sceneId: z.enum(["cream", "modern", "wood"]),
  light: z.string(), angle: z.string(), share: z.number().min(45).max(80),
  prompt: z.string(), promptDirty: z.boolean(), brightness: z.number().min(-20).max(20),
  caseSeeded: z.boolean().optional(),
  caseId: z.enum(["33", "22"]).default("33"),
  skuId: z.enum(["own-1", "own-2", "own-3", "own-4"]).default("own-1"),
  tone: z.enum(["light", "dark"]).default("light"),
  scenePrepared: z.boolean().default(false), scenePrompt: z.string().default(""), scenePromptDirty: z.boolean().default(false),
  sceneGenerated: z.boolean().default(false),
  sceneBatch: z.union([z.literal(0), z.literal(1)]).default(0),
  lastSceneBatch: z.union([z.literal(0), z.literal(1)]).optional(),
  workflowRevision: z.number().default(1),
  mainReferenceUrl: z.string().default(demoAssetUrl("/demo/source-sets/light-reference-1.jpg")),
  mainReferenceName: z.string().default("浅色主图"),
  result: resultSchema.optional(), completed: resultSchema.optional(),
});
export type DemoState = z.infer<typeof stateSchema>;
export type DemoResult = z.infer<typeof resultSchema>;
export type DemoSceneId = DemoState["sceneId"];
export type DemoAction =
  | { type: "step"; step: WorkbenchStep }
  | { type: "mainReference"; url: string; name: string }
  | { type: "scene"; id: DemoSceneId }
  | { type: "sku"; id: OwnSkuId }
  | { type: "tone"; tone: SceneTone }
  | { type: "scenePrompt"; text: string }
  | { type: "resetScenePrompt" }
  | { type: "prepareScene" }
  | { type: "startSceneGeneration" }
  | { type: "sceneGenerated" }
  | { type: "prompt"; text: string }
  | { type: "product"; name: string; direction: string }
  | { type: "settings"; light?: string; angle?: string; share?: number }
  | { type: "resetPrompt" }
  | { type: "brightness"; value: number }
  | { type: "generate"; at: string }
  | { type: "complete" }
  | { type: "loadCase" }
  | { type: "reset" };

export function buildScenePrompt(state: Pick<DemoState, "tone" | "sceneId"> & Partial<Pick<DemoState, "sceneBatch">>) {
  const scene = getOwnScene(state.tone, state.sceneId, state.sceneBatch);
  const angles = ownAngles.map(angle => getOwnScene(state.tone, angle.id, state.sceneBatch).angleName).join("、");
  return `一次制作三张无字的 1:1 场景图，家具方案统一为${scene.theme}。\n分别采用当前组的${angles}三个参考角度；每张按对应原图锁定地毯角度、位置、轮廓、透视，保持镜头构图。\n只更换周边家具陈设，统一为${scene.details}。\n保留参考地毯作为位置依据，此阶段不替换产品花纹。去除文字、标志和人物，补全背景。\n输出三张独立的正方形图片，不拼成一张，不添加文字或水印，供用户选择其中一张进行地毯融合。`;
}

export function buildDemoPrompt(state: Pick<DemoState, "caseId" | "sceneId" | "light" | "angle" | "share" | "direction"> & Partial<Pick<DemoState, "skuId" | "tone" | "sceneBatch">>) {
  if (state.caseId === "33") {
    const sku = getOwnSku(state.skuId);
    const scene = getOwnScene(state.tone ?? "light", state.sceneId, state.sceneBatch);
    return `制作一张无字的 1:1 地毯商品主图。\n图片 1 为自己的 SKU 产品图（${sku.label}），图片 2 为已采用的场景（${scene.name}）。两张图片一起作为输入。\n只替换场景中的地毯，严格保留产品特征：${sku.features}，以及原有颜色、比例和纹理。\n地毯角度、位置、轮廓、透视以场景为准，家具陈设和镜头角度保持不变。匹配场景光线、接触阴影与遮挡关系。\n需求：${state.direction}\n只输出一张正方形图片，不添加文字、水印或额外地毯。`;
  }
  const product = getDemoCase(state.caseId);
  const scene = product.scenes.find((item) => item.id === state.sceneId)!;
  return `为天猫地毯店铺制作一张 1:1 商品主图。\n图片 1 是产品地毯图，图片 2 是意向场景图。将图片 1 的地毯替换到图片 2 中。\n严格保留产品特征：${product.features}，以及原图中的地毯颜色、形状、比例和材质。\n场景：${scene.name}；家具与周边细节：${scene.details}。\n光线：${state.light}；视角：${state.angle}；地毯占画面约 ${state.share}%。\n需求：${state.direction}\n地毯边缘完整、透视自然，阴影与场景一致。去除参考图中的营销文案、价格、徽标和人物，只保留家居场景与产品。\n只输出一张图片，不添加文字或水印。`;
}

export function createDemoState(caseId: DemoCaseId = "33"): DemoState {
  const demoCase = getDemoCase(caseId);
  const state: DemoState = {
    version: 1, step: "import", productName: demoCase.name, direction: demoCase.direction,
    sceneId: demoCase.defaultSceneId, light: "明亮柔和的自然光", angle: "45° 斜角视角", share: 65,
    prompt: "", promptDirty: false, brightness: 0, caseSeeded: true, caseId,
    skuId: "own-1", tone: "light", scenePrepared: false, sceneGenerated: false, sceneBatch: 0, scenePrompt: "", scenePromptDirty: false, workflowRevision: 5,
    mainReferenceUrl: demoAssetUrl("/demo/source-sets/light-reference-1.jpg"), mainReferenceName: "浅色主图",
  };
  const prompt = buildDemoPrompt(state);
  if (caseId === "33") return { ...state, angle: "按参考图锁定", prompt, scenePrompt: buildScenePrompt(state) };
  const result: DemoResult = {
    id: `demo-case-${caseId}`, caseId, productName: demoCase.name, sceneId: state.sceneId, sceneName: demoCase.scenes.find((item) => item.id === state.sceneId)!.name,
    prompt, imageUrl: demoCase.resultUrl, createdAt: "2026-10-09T02:00:00.000Z", brightness: 0,
    width: demoCase.width, height: demoCase.height,
  };
  return { ...state, prompt, result, completed: result };
}

function fillDemoCase(state: DemoState): DemoState {
  const seeded = createDemoState(state.caseId);
  return { ...state, caseSeeded: true, result: state.result ?? seeded.result, completed: state.completed ?? seeded.completed };
}

// Read the briefly used packed storage format so rolling back does not discard user data.
function parseSavedDemoState(stored: string): unknown {
  const saved = JSON.parse(stored);
  if (saved?.format !== "demo-images-v1") return saved;
  return JSON.parse(JSON.stringify(saved.state), (_key, value) => {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, "$demoInlineImage")) return value;
    const index = value.$demoInlineImage;
    if (!Number.isInteger(index) || index < 0 || !Array.isArray(saved.images)) throw new Error("Invalid stored image reference");
    const image = saved.images[index];
    if (typeof image !== "string" || !image.startsWith("data:image/")) throw new Error("Missing stored image");
    return image;
  });
}

export function readDemoState(storage?: Pick<Storage, "getItem">, caseId: DemoCaseId = "33"): DemoState {
  try {
    const stored = storage?.getItem(`${DEMO_STORAGE_KEY}-${caseId}`);
    if (stored) {
      const parsed = stateSchema.safeParse(parseSavedDemoState(stored));
      if (parsed.success && parsed.data.caseId === caseId) {
        let state = parsed.data.caseSeeded ? parsed.data : fillDemoCase(parsed.data);
        const product = getDemoCase(caseId);
        if (caseId === "33" && state.workflowRevision < 2) {
          state = { ...state, workflowRevision: 2, angle: "按参考图锁定", scenePrepared: false,
            productName: state.productName === "可拆洗双层地毯 · 浅茶色" ? product.name : state.productName,
            direction: state.direction === "使用浅茶色双层地毯，保留细密编织质感，在意式复古客厅中突出地毯的铺设效果。" ? product.direction : state.direction };
          state = refreshPrompts(state);
        }
        const refreshResult = (result?: DemoResult) => caseId === "33" && result && [demoAssetUrl("/demo/user-33/main-2.jpg"), demoAssetUrl("/demo/user-33/main-2-clean.png")].includes(result.imageUrl)
          ? undefined
          : result;
        // Drop the withdrawn furniture-variant batch, but retain uploads and completed works.
        if (caseId === "33" && state.workflowRevision === 3) {
          state = { ...clearScene(state), workflowRevision: 2 };
          state = refreshPrompts(state);
        }
        // Replace only obsolete built-in defaults; preserve uploads, edited prompts and completed history.
        if (caseId === "33" && state.workflowRevision < 4) {
          const reference = mainReferences.find(item => item.tone === state.tone)!;
          const wasDefault = /^\/demo\/user-33\/main-(?:[1-5]\.jpg|2-clean\.png)$/.test(state.mainReferenceUrl);
          const obsoleteResult = state.result?.imageUrl.startsWith(demoAssetUrl("/demo/own-scenes/")) || state.result?.imageUrl.startsWith(demoAssetUrl("/demo/furniture-variants/"));
          state = { ...state, workflowRevision: 4, sceneGenerated: false, scenePrepared: false,
            result: obsoleteResult ? undefined : state.result,
            ...(wasDefault ? { mainReferenceUrl: reference.url, mainReferenceName: reference.label } : {}) };
          state = refreshPrompts(state);
        }
        if (caseId === "33" && state.workflowRevision < 5) {
          state = { ...state, workflowRevision: 5, sceneBatch: 0, lastSceneBatch: state.sceneGenerated ? 0 : undefined };
        }
        // The first-step reference is authoritative, including older caches that allowed tone switching.
        if (caseId === "33") {
          const reference = mainReferences.find(item => item.url === state.mainReferenceUrl || item.fileName === state.mainReferenceName);
          if (reference && reference.tone !== state.tone) {
            state = refreshPrompts(clearScene({ ...state, tone: reference.tone, sceneBatch: 0, lastSceneBatch: undefined }));
          }
        }
        if (caseId === "33" && !state.scenePromptDirty) state = { ...state, scenePrompt: buildScenePrompt(state) };
        if (caseId === "33" && !state.sceneGenerated) state = { ...state, scenePrepared: false };
        const result = refreshResult(state.result);
        return { ...state, result, completed: refreshResult(state.completed), step: state.step === "adjust" && !result && (caseId !== "33" || Boolean(state.result)) ? "scene" : state.step };
      }
    }
  } catch { /* A damaged or unavailable local store starts a fresh demo. */ }
  return createDemoState(caseId);
}

function refreshPrompts(state: DemoState): DemoState {
  return { ...state, prompt: state.promptDirty ? state.prompt : buildDemoPrompt(state),
    scenePrompt: state.scenePromptDirty ? state.scenePrompt : buildScenePrompt(state) };
}
function clearCandidate(state: DemoState): DemoState {
  return { ...state, result: undefined, scenePrepared: false, brightness: 0, step: state.step === "adjust" ? "scene" : state.step };
}
function clearScene(state: DemoState): DemoState {
  return { ...clearCandidate(state), sceneGenerated: false };
}
export function reduceDemoState(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "mainReference": {
      const reference = mainReferences.find(item => item.url === action.url || item.fileName === action.name);
      return refreshPrompts(clearScene({ ...state, mainReferenceUrl: action.url, mainReferenceName: action.name,
        sceneBatch: 0, lastSceneBatch: undefined,
        tone: state.caseId === "33" && reference ? reference.tone : state.tone }));
    }
    case "step": return action.step === "adjust" && !state.result && state.caseId !== "33" ? state : { ...state, step: action.step };
    case "scene": {
      if (state.caseId === "33" && state.sceneId === action.id) return state;
      if (state.caseId === "33") return refreshPrompts(clearCandidate({ ...state, sceneId: action.id }));
      const next = { ...state, sceneId: action.id, promptDirty: false, result: undefined, brightness: 0, step: state.step === "adjust" ? "scene" as const : state.step };
      return { ...next, prompt: buildDemoPrompt(next) };
    }
    case "sku": return refreshPrompts(clearCandidate({ ...state, skuId: action.id, productName: getOwnSku(action.id).name }));
    case "tone": return state.caseId === "33" || state.tone === action.tone ? state : refreshPrompts(clearScene({ ...state, tone: action.tone }));
    case "scenePrompt": return action.text === state.scenePrompt ? state : { ...clearScene(state), scenePrompt: action.text, scenePromptDirty: true };
    case "resetScenePrompt": return { ...(buildScenePrompt(state) === state.scenePrompt ? state : clearScene(state)), scenePrompt: buildScenePrompt(state), scenePromptDirty: false };
    case "startSceneGeneration": {
      if (!state.scenePrompt.trim()) return state;
      const sceneBatch = state.lastSceneBatch === undefined ? 0 : state.lastSceneBatch === 0 ? 1 : 0;
      return refreshPrompts(clearScene({ ...state, sceneBatch }));
    }
    case "sceneGenerated": return state.scenePrompt.trim() ? { ...state, sceneGenerated: true, scenePrepared: false, lastSceneBatch: state.sceneBatch } : state;
    case "prepareScene": return state.scenePrompt.trim() && (state.caseId !== "33" || state.sceneGenerated) ? { ...state, scenePrepared: true } : state;
    case "prompt": return { ...state, prompt: action.text, promptDirty: true };
    case "product": {
      const next = { ...state, productName: action.name, direction: action.direction };
      return { ...next, prompt: state.promptDirty ? state.prompt : buildDemoPrompt(next) };
    }
    case "settings": {
      const { type: _type, ...settings } = action;
      const next = { ...state, ...settings };
      return { ...next, prompt: state.promptDirty ? state.prompt : buildDemoPrompt(next) };
    }
    case "resetPrompt": return { ...state, prompt: buildDemoPrompt(state), promptDirty: false };
    case "brightness": return { ...state, brightness: action.value };
    case "generate": {
      if (!state.prompt.trim()) return state;
      if (state.caseId === "33") {
        if (!state.sceneGenerated || !state.scenePrepared || state.skuId !== "own-1") return state;
        const scene = getOwnScene(state.tone, state.sceneId, state.sceneBatch);
        return { ...state, brightness: 0, result: {
          id: `demo-33-${action.at}`, caseId: "33", productName: state.productName,
          sceneId: state.sceneId, sceneName: scene.name, prompt: state.prompt, scenePrompt: state.scenePrompt,
          imageUrl: scene.resultUrl, productImageUrl: getOwnSku(state.skuId).url, sceneImageUrl: scene.previewUrl,
          createdAt: action.at, brightness: 0, width: scene.width, height: scene.height, skuId: state.skuId, tone: state.tone,
        } };
      }
      const product = getDemoCase(state.caseId);
      const scene = product.scenes.find((item) => item.id === state.sceneId)!;
      return { ...state, brightness: 0, result: {
        id: `demo-${state.caseId}-${action.at}`, caseId: state.caseId, productName: state.productName, sceneId: scene.id, sceneName: scene.name,
        prompt: state.prompt, imageUrl: product.resultUrl, createdAt: action.at, brightness: 0,
        width: product.width, height: product.height,
      } };
    }
    case "complete": return state.result ? { ...state, completed: { ...state.result, brightness: state.brightness } } : state;
    case "loadCase": return fillDemoCase(state);
    case "reset": return createDemoState(state.caseId);
  }
}
