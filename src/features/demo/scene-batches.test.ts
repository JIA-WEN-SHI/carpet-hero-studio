import { expect, it } from "vitest";
import { createDemoState, readDemoState, reduceDemoState, type DemoState } from "./demo-state";
import { getOwnScene, ownAngles } from "./own-products";

const generateBatch = (state: DemoState) => reduceDemoState(reduceDemoState(state, { type: "startSceneGeneration" }), { type: "sceneGenerated" });

it.each(["light", "dark"] as const)("%s每批三张，六张不同角度循环且始终同风格", tone => {
  let state = reduceDemoState(createDemoState(), { type: "mainReference", url: `/demo/source-sets/${tone}-reference-1.jpg`, name: `${tone}.jpg` });
  const references = new Set<string>();
  for (const batch of [0, 1, 0] as const) {
    state = generateBatch(state);
    expect(state.sceneBatch).toBe(batch);
    expect(state.tone).toBe(tone);
    for (const angle of ownAngles) {
      const scene = getOwnScene(tone, angle.id, state.sceneBatch);
      expect(scene.previewUrl).toBe(`/demo/source-sets/${tone}-scene-${angle.number + batch * 3}.png`);
      references.add(scene.referenceUrl);
    }
  }
  expect(references.size).toBe(6);
});

it("重新生成隐藏旧图并清除采用状态，第二批融合记录跟随场景，保留已完成作品", () => {
  let state = generateBatch(createDemoState());
  state = reduceDemoState(state, { type: "prepareScene" });
  state = reduceDemoState(state, { type: "generate", at: "first" });
  state = reduceDemoState(state, { type: "complete" });
  const completed = state.completed;
  state = reduceDemoState(state, { type: "startSceneGeneration" });
  expect(state).toMatchObject({ sceneBatch: 1, sceneGenerated: false, scenePrepared: false });
  expect(state.result).toBeUndefined();
  expect(state.completed).toEqual(completed);
  state = reduceDemoState(state, { type: "sceneGenerated" });
  state = reduceDemoState(state, { type: "scene", id: "wood" });
  state = reduceDemoState(state, { type: "prepareScene" });
  state = reduceDemoState(state, { type: "generate", at: "second" });
  expect(state.result).toMatchObject({ sceneImageUrl: "/demo/source-sets/light-scene-6.png", imageUrl: "/demo/source-sets/light-fusion-6.png" });
  const restored = readDemoState({ getItem: () => JSON.stringify(state) });
  expect(restored.sceneBatch).toBe(1);
  expect(restored.result).toEqual(state.result);
  expect(generateBatch(restored).sceneBatch).toBe(0);
});

it("换主图从首批开始，不换SKU；旧tone动作不能绕过第一步切换风格", () => {
  let state = generateBatch(generateBatch(createDemoState()));
  state = reduceDemoState(state, { type: "sku", id: "own-3" });
  state = reduceDemoState(state, { type: "mainReference", url: "/demo/source-sets/dark-reference-1.jpg", name: "深色主图" });
  expect(state).toMatchObject({ tone: "dark", sceneBatch: 0, sceneGenerated: false, skuId: "own-3" });
  expect(generateBatch(state).sceneBatch).toBe(0);
  expect(reduceDemoState(state, { type: "tone", tone: "light" })).toEqual(state);
});

it("中途刷新后重试仍为未完成批次，不跳过另外三张", () => {
  let state = generateBatch(createDemoState());
  state = reduceDemoState(state, { type: "startSceneGeneration" });
  state = readDemoState({ getItem: () => JSON.stringify(state) });
  expect(generateBatch(state).sceneBatch).toBe(1);
});

it("空提示词不会推进批次；手写提示词换批后仍保留", () => {
  let state = generateBatch(createDemoState());
  state = reduceDemoState(state, { type: "scenePrompt", text: "" });
  expect(reduceDemoState(state, { type: "startSceneGeneration" })).toEqual(state);
  state = reduceDemoState(state, { type: "scenePrompt", text: "我自定义的场景要求" });
  state = reduceDemoState(state, { type: "prompt", text: "我自定义的融合要求" });
  state = generateBatch(state);
  expect(state.sceneBatch).toBe(1);
  expect(state.scenePrompt).toBe("我自定义的场景要求");
  expect(state.prompt).toBe("我自定义的融合要求");
});

it("旧缓存主图与色系冲突时以第一步为准，保留历史作品", () => {
  const completed = createDemoState("22").completed;
  const old = { ...createDemoState(), workflowRevision: 4, tone: "dark", sceneGenerated: true, scenePrepared: true, completed };
  const restored = readDemoState({ getItem: () => JSON.stringify(old) });
  expect(restored).toMatchObject({ tone: "light", sceneGenerated: false, scenePrepared: false, sceneBatch: 0 });
  expect(restored.completed).toEqual(completed);
});
