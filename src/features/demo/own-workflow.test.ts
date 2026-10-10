import { describe, expect, it } from "vitest";
import { createDemoState, readDemoState, reduceDemoState } from "./demo-state";

describe("自有 SKU 与两阶段场景融合", () => {
  it("一次生成整组三个角度，切换候选不清除生成状态，采用后只融合所选场景", () => {
    let state = reduceDemoState(createDemoState("33"), { type: "sceneGenerated" });
    state = reduceDemoState(state, { type: "prepareScene" });
    state = reduceDemoState(state, { type: "scene", id: "wood" });
    expect(state.sceneGenerated).toBe(true);
    expect(state.scenePrepared).toBe(false);
    expect(readDemoState({ getItem: () => JSON.stringify(state) }, "33").sceneGenerated).toBe(true);
    state = reduceDemoState(state, { type: "prepareScene" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-10T08:00:00.000Z" });
    expect(state.result?.imageUrl).toBe("/demo/source-sets/light-fusion-3.png");
  });
  it("场景未生成不能采用或融合，生成完成后才可继续", () => {
    const initial = createDemoState("33");
    expect(initial.sceneGenerated).toBe(false);
    expect(reduceDemoState(initial, { type: "prepareScene" }).scenePrepared).toBe(false);
    let state = reduceDemoState(initial, { type: "sceneGenerated" });
    expect(state.sceneGenerated).toBe(true);
    state = reduceDemoState(state, { type: "sceneGenerated" });
    state = reduceDemoState(state, { type: "prepareScene" });
    expect(state.scenePrepared).toBe(true);
    state = reduceDemoState(state, { type: "mainReference", url: "/demo/source-sets/dark-reference-1.jpg", name: "深色主图" });
    expect(state.sceneGenerated).toBe(false);
    expect(state.scenePrepared).toBe(false);
  });
  it("重复选择已采用的同一角度和深浅方案，不清除采用状态或候选", () => {
    let state = reduceDemoState(reduceDemoState(createDemoState("33"), { type: "sceneGenerated" }), { type: "prepareScene" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-10T08:00:00.000Z" });
    const result = state.result;
    state = reduceDemoState(state, { type: "scene", id: state.sceneId });
    state = reduceDemoState(state, { type: "tone", tone: state.tone });
    expect(state.scenePrepared).toBe(true);
    expect(state.result).toEqual(result);
  });
  it("参考主图与自有产品分开保存，更换参考只清除候选不改已交付作品", () => {
    let state = reduceDemoState(reduceDemoState(createDemoState("33"), { type: "sceneGenerated" }), { type: "prepareScene" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    state = reduceDemoState(state, { type: "complete" });
    const completed = state.completed;
    state = reduceDemoState(state, { type: "mainReference", url: "/demo/user-33/main-3.jpg", name: "原主图 3" });
    expect(state.skuId).toBe("own-1");
    expect(state.result).toBeUndefined();
    expect(state.scenePrepared).toBe(false);
    expect(state.completed).toEqual(completed);
    expect(readDemoState({ getItem: () => JSON.stringify(state) }, "33").mainReferenceUrl).toBe("/demo/user-33/main-3.jpg");
  });
  it("未生成也可进入交付页查看生成入口，刷新后仍保留该步骤且不伪造首图", () => {
    const state = reduceDemoState(createDemoState("33"), { type: "step", step: "adjust" });
    expect(state.step).toBe("adjust");
    expect(state.result).toBeUndefined();
    const restored = readDemoState({ getItem: () => JSON.stringify(state) }, "33");
    expect(restored.step).toBe("adjust");
    expect(restored.completed).toBeUndefined();
  });
  it("自有产品默认不是已完成成品，未采用场景时不能融合", () => {
    const initial = createDemoState("33");
    expect(initial.productName).toBe("自有条纹地毯 · 黑边米白款");
    expect(initial.result).toBeUndefined();
    expect(initial.completed).toBeUndefined();
    expect(reduceDemoState(initial, { type: "generate", at: "2026-10-09T08:00:00.000Z" }).result).toBeUndefined();
  });

  it("切换自有 SKU 会同步图案约束，不能冒用 SKU01 的融合图片", () => {
    let state = reduceDemoState(createDemoState("33"), { type: "sku", id: "own-3" });
    expect(state).toMatchObject({ skuId: "own-3", productName: "自有条纹地毯 · 米白细条款" });
    expect(state.prompt).toContain("米白主体与两端细条纹");
    state = reduceDemoState(state, { type: "sceneGenerated" });
    state = reduceDemoState(state, { type: "prepareScene" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    expect(state.result).toBeUndefined();
  });

  it("深色的正向纵深场景采用后，记录正确的产品图、场景图和 1:1 成图", () => {
    let state = reduceDemoState(createDemoState("33"), { type: "mainReference", url: "/demo/source-sets/dark-reference-1.jpg", name: "深色主图" });
    state = reduceDemoState(state, { type: "scene", id: "modern" });
    state = reduceDemoState(state, { type: "sceneGenerated" });
    state = reduceDemoState(state, { type: "prepareScene" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    expect(state.result).toMatchObject({
      imageUrl: "/demo/source-sets/dark-fusion-2.png",
      productImageUrl: "/demo/user-33/own-sku-1.png",
      sceneImageUrl: "/demo/source-sets/dark-scene-2.png",
      width: 1254, height: 1254, tone: "dark", skuId: "own-1",
    });
    state = reduceDemoState(state, { type: "complete" });
    expect(readDemoState({ getItem: () => JSON.stringify(state) }, "33").completed?.imageUrl).toBe("/demo/source-sets/dark-fusion-2.png");
  });

  it("换方案后清除旧候选与场景采用状态，但保留已完成作品", () => {
    let state = reduceDemoState(reduceDemoState(createDemoState("33"), { type: "sceneGenerated" }), { type: "prepareScene" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    state = reduceDemoState(state, { type: "complete" });
    state = reduceDemoState(state, { type: "mainReference", url: "/demo/source-sets/dark-reference-1.jpg", name: "深色主图" });
    expect(state.result).toBeUndefined();
    expect(state.scenePrepared).toBe(false);
    expect(state.completed?.imageUrl).toBe("/demo/source-sets/light-fusion-1.png");
  });

  it("两个提示词模板区分换家具与换地毯，均锁定角度且不添加文字", () => {
    const state = createDemoState("33");
    expect(state.scenePrompt).toContain("只更换周边家具陈设");
    expect(state.scenePrompt).toContain("地毯角度、位置、轮廓、透视");
    expect(state.scenePrompt).toContain("1:1");
    expect(state.prompt).toContain("只替换场景中的地毯");
    expect(state.prompt).toContain("家具陈设和镜头角度保持不变");
    expect(state.prompt).not.toContain("45°");
    expect(state.prompt).not.toContain("浅茶色");
  });

  it("保存两个手动模板后切换方案、刷新仍保留用户修改", () => {
    let state = reduceDemoState(createDemoState("33"), { type: "scenePrompt", text: "统一原木家具，保留地毯角度。" });
    state = reduceDemoState(state, { type: "prompt", text: "仅替换地毯图案。" });
    state = reduceDemoState(state, { type: "mainReference", url: "/demo/source-sets/dark-reference-1.jpg", name: "深色主图" });
    const restored = readDemoState({ getItem: () => JSON.stringify(state) }, "33");
    expect(restored.scenePrompt).toBe("统一原木家具，保留地毯角度。");
    expect(restored.prompt).toBe("仅替换地毯图案。");
  });

  it("上传主图不锁定后续角度，切换角度并刷新仍保留独立选择", () => {
    let state = reduceDemoState(createDemoState("33"), { type: "mainReference", url: "/demo/own-scenes/reference-angle-3.jpg", name: "参考主图 3 · 俯视近景" });
    expect(state.sceneId).toBe("cream");
    state = reduceDemoState(state, { type: "scene", id: "modern" });
    expect(state.sceneId).toBe("modern");
    expect(readDemoState({ getItem: () => JSON.stringify(state) }, "33").sceneId).toBe("modern");
    state = reduceDemoState(state, { type: "mainReference", url: "/demo/source-sets/dark-reference-1.jpg", name: "深色主图" });
    state = reduceDemoState(state, { type: "sceneGenerated" });
    state = reduceDemoState(state, { type: "prepareScene" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    expect(state.result?.sceneImageUrl).toBe("/demo/source-sets/dark-scene-2.png");
  });

  it("上传新主图后仍可按原流程选择场景并播放预制生成演示", () => {
    let state = reduceDemoState(createDemoState("33"), { type: "mainReference", url: "data:image/png;base64,custom", name: "新主图.png" });
    state = reduceDemoState(state, { type: "sceneGenerated" });
    state = reduceDemoState(state, { type: "prepareScene" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    expect(state.scenePrepared).toBe(true);
    expect(state.result?.imageUrl).toBe("/demo/source-sets/light-fusion-1.png");
  });

  it("回退后修正未手改的锁定模板，保留主图、已完成作品与手动提示词", () => {
    let state = reduceDemoState(reduceDemoState(createDemoState("33"), { type: "sceneGenerated" }), { type: "prepareScene" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    state = reduceDemoState(state, { type: "complete" });
    const stored = { ...state, scenePrompt: "旧的唯一构图依据模板", mainReferenceUrl: "data:image/png;base64,custom" };
    const restored = readDemoState({ getItem: () => JSON.stringify(stored) }, "33");
    expect(restored.scenePrompt).toBe(createDemoState("33").scenePrompt);
    expect(restored.completed).toEqual(state.completed);
    expect(restored.mainReferenceUrl).toBe(stored.mainReferenceUrl);
    expect(readDemoState({ getItem: () => JSON.stringify({ ...stored, scenePromptDirty: true }) }, "33").scenePrompt).toBe(stored.scenePrompt);
  });
});
