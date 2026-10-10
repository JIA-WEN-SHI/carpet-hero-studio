import { expect, it } from "vitest";
import { createDemoState, readDemoState } from "./demo-state";
import { getOwnScene } from "./own-products";

it("回退为三个角度，兼容刚才保存的包装格式，不丢上传图和已完成记录", () => {
  const completed = createDemoState("22").completed!;
  const state = { ...createDemoState("33"), workflowRevision: 3, sceneGenerated: true, scenePrepared: true,
    mainReferenceUrl: { $demoInlineImage: 0 }, completed: { ...completed, caseId: "33" },
    prompt: "用户融合提示词", promptDirty: true, scenePrompt: "用户场景提示词", scenePromptDirty: true };
  const stored = JSON.stringify({ format: "demo-images-v1", images: ["data:image/png;base64,original"], state });
  const restored = readDemoState({ getItem: () => stored }, "33");
  expect(getOwnScene("light", "modern").name).toBe("浅色方案 · 俯视近景");
  expect(restored.workflowRevision).toBe(5);
  expect(restored.mainReferenceUrl).toBe("data:image/png;base64,original");
  expect(restored.completed?.imageUrl).toBe(completed.imageUrl);
  expect(restored.sceneGenerated).toBe(false);
  expect(restored.scenePrepared).toBe(false);
  expect(restored.prompt).toBe("用户融合提示词");
  expect(restored.scenePrompt).toBe("用户场景提示词");
});
