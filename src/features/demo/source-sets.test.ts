import { expect, it } from "vitest";
import { createDemoState, reduceDemoState, readDemoState } from "./demo-state";
import { getOwnScene } from "./own-products";

it.each(["light", "dark"] as const)("旧默认图迁移为%s指定主图，不改地毯或历史首图", tone => {
  const state = { ...createDemoState("33"), tone, workflowRevision: 2, mainReferenceUrl: "/demo/user-33/main-2-clean.png",
    mainReferenceName: "主图 2 · 无字版", skuId: "own-3", completed: { ...createDemoState("22").completed!, caseId: "33" } };
  const restored = readDemoState({ getItem: () => JSON.stringify(state) }, "33");
  expect(restored.mainReferenceUrl).toBe(`/demo/source-sets/${tone}-reference-1.jpg`);
  expect(restored.skuId).toBe("own-3");
  expect(restored.completed).toEqual(state.completed);
  expect(restored.workflowRevision).toBe(5);
});

it("第一步指定场景主图切换默认深浅组，第二步地毯不变", () => {
  let state = createDemoState("33");
  expect(state.mainReferenceUrl).toBe("/demo/source-sets/light-reference-1.jpg");
  state = reduceDemoState(state, { type: "sku", id: "own-3" });
  state = reduceDemoState(state, { type: "mainReference", url: "/demo/source-sets/dark-reference-1.jpg", name: "深色主图" });
  expect(state.tone).toBe("dark");
  expect(state.skuId).toBe("own-3");
  expect(state.sceneGenerated).toBe(false);
  expect(state.scenePrompt).toContain("深色方案");
  state = reduceDemoState(state, { type: "mainReference", url: "/demo/source-sets/light-reference-1.jpg", name: "浅色主图" });
  expect(state.tone).toBe("light");
  expect(state.skuId).toBe("own-3");
});

it("从本地上传指定文件也默认切换对应组，不换SKU", () => {
  const state = reduceDemoState(createDemoState("33"), { type: "mainReference", url: "data:image/jpeg;base64,uploaded", name: "51eeb958ecee9ce30a3b5d83e4182418.jpg" });
  expect(state.tone).toBe("dark");
  expect(state.mainReferenceUrl).toBe("data:image/jpeg;base64,uploaded");
  expect(state.skuId).toBe("own-1");
});

it("两套共六张角度参考各自对应场景和融合成图", () => {
  const sources = new Set<string>();
  for (const tone of ["light", "dark"] as const) {
    for (const [index, id] of (["cream", "modern", "wood"] as const).entries()) {
      const scene = getOwnScene(tone, id);
      expect(scene.referenceUrl).toBe(`/demo/source-sets/${tone}-reference-${index + 1}.jpg`);
      expect(scene.previewUrl).toBe(`/demo/source-sets/${tone}-scene-${index + 1}.png`);
      expect(scene.resultUrl).toBe(`/demo/source-sets/${tone}-fusion-${index + 1}.png`);
      sources.add(scene.referenceUrl);
    }
  }
  expect(sources.size).toBe(6);
});
