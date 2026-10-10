import { describe, expect, it } from "vitest";
import { createDemoState, readDemoState, reduceDemoState } from "./demo-state";

describe("演示案例流程", () => {
  it("清除候选后阻止进入调整，并保留已有的示例交付", () => {
    const initial = reduceDemoState(createDemoState("22"), { type: "scene", id: "wood" });
    expect(reduceDemoState(initial, { type: "step", step: "adjust" }).step).toBe("import");
    expect(reduceDemoState(initial, { type: "complete" }).completed?.id).toBe(initial.completed?.id);
  });

  it("直接预填产品、生成方案和已完成首图，可跳到交付查看完整案例", () => {
    const initial = createDemoState("22");
    expect(initial.result?.imageUrl).toBe("/demo/user-22/main-3.jpg");
    expect(initial.completed?.productName).toBe("原纱浮雕双层地毯 · 深古木");
    expect(reduceDemoState(initial, { type: "step", step: "adjust" }).step).toBe("adjust");
  });

  it("补齐旧演示记录中的案例成图，同时保留已编辑的提示词", () => {
    const old = { ...createDemoState("22"), caseSeeded: undefined, result: undefined, completed: undefined, prompt: "用户修改的提示词", promptDirty: true };
    const restored = readDemoState({ getItem: () => JSON.stringify(old) }, "22");
    expect(restored.prompt).toBe("用户修改的提示词");
    expect(restored.completed?.imageUrl).toBe("/demo/user-22/main-3.jpg");
  });

  it("旧的原主图案例不再被当作自有地毯成品，用户提示词保留", () => {
    const saved = createDemoState("33");
    const original = { ...createDemoState("22").result!, caseId: "33" as const, imageUrl: "/demo/user-33/main-2-clean.png", width: 1086, height: 1448, brightness: 8, prompt: "用户手动记录的提示词" };
    const old = { ...saved, step: "adjust", prompt: original.prompt, promptDirty: true, result: original, completed: original };
    const restored = readDemoState({ getItem: () => JSON.stringify(old) }, "33");
    expect(restored.step).toBe("scene");
    expect(restored.prompt).toBe(original.prompt);
    expect(restored.result).toBeUndefined();
    expect(restored.completed).toBeUndefined();
  });

  it("替换无字素材不会改动其他图片的交付记录", () => {
    const state = createDemoState("33");
    const custom = { ...createDemoState("22").result!, caseId: "33" as const, imageUrl: "/demo/custom-upload.png", width: 800, height: 800 };
    const restored = readDemoState({ getItem: () => JSON.stringify({ ...state, result: custom, completed: custom }) }, "33");
    expect(restored.result).toEqual(custom);
    expect(restored.completed).toEqual(custom);
    const other = createDemoState("22");
    expect(readDemoState({ getItem: () => JSON.stringify(other) }, "22")).toEqual(other);
  });

  it("将选择的场景和修改后的提示词保存到生成记录，重复交付不产生重复记录", () => {
    let state = reduceDemoState(createDemoState("22"), { type: "scene", id: "modern" });
    state = reduceDemoState(state, { type: "prompt", text: "保留蓝色花纹，增加柔和侧光。" });
    state = reduceDemoState(state, { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    expect(state.result?.sceneId).toBe("modern");
    expect(state.result?.prompt).toBe("保留蓝色花纹，增加柔和侧光。");
    state = reduceDemoState(state, { type: "brightness", value: 8 });
    state = reduceDemoState(state, { type: "complete" });
    expect(state.completed?.brightness).toBe(8);
    expect(reduceDemoState(state, { type: "complete" }).completed?.id).toBe(state.completed?.id);
    expect(readDemoState({ getItem: () => JSON.stringify(state) }, "22").completed?.prompt)
      .toBe("保留蓝色花纹，增加柔和侧光。");
  });

  it("切换场景后清除当前候选，保留已交付作品", () => {
    let state = reduceDemoState(createDemoState("22"), { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    state = reduceDemoState(state, { type: "complete" });
    state = reduceDemoState(state, { type: "scene", id: "wood" });
    expect(state.result).toBeUndefined();
    expect(state.completed?.sceneId).toBe("wood");
    expect(reduceDemoState(state, { type: "step", step: "adjust" }).step).not.toBe("adjust");
  });

  it.each(["invalid-json", '{"version":1,"step":"adjust"}', '{"version":999}'])(
    "本地演示记录损坏时恢复可用的预填案例：%s", (stored) => {
      const restored = readDemoState({ getItem: () => stored });
      expect(restored.step).toBe("import");
      expect(restored.prompt.length).toBeGreaterThan(20);
      expect(restored.completed).toBeUndefined();
    },
  );

  it("第二套素材生成和交付使用 22 的图片与纹理约束", () => {
    let state = createDemoState("22");
    expect(state.productName).toBe("原纱浮雕双层地毯 · 深古木");
    expect(state.prompt).toContain("米棕交织的浮雕肌理");
    expect(state.prompt).not.toContain("蓝色花纹");
    state = reduceDemoState(state, { type: "generate", at: "2026-10-09T08:00:00.000Z" });
    expect(state.result?.imageUrl).toBe("/demo/user-22/main-3.jpg");
    expect(state.result?.width).toBe(1440);
    expect(state.result?.height).toBe(1440);
  });
});
