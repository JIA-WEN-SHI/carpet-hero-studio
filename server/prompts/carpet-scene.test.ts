import { describe, expect, it } from "vitest";
import { renderCarpetScenePrompt } from "./carpet-scene";

describe("renderCarpetScenePrompt", () => {
  it("assigns image roles and forbids inherited marketing text", () => {
    const prompt = renderCarpetScenePrompt({
      room: "客厅",
      style: "奶油风",
      space: "中等空间",
      light: "自然光",
      view: "45°斜角",
      productShare: 65,
      includePeopleOrPets: false,
      notes: "浅色沙发，不遮挡地毯",
    });

    expect(prompt).toContain("第一张图是产品地毯");
    expect(prompt).toContain("第二张图是目标场景");
    expect(prompt).toContain("不要生成文字、水印、价格或营销标签");
    expect(prompt).toContain("产品占画面约 65%");
    expect(prompt).toContain("浅色沙发，不遮挡地毯");
  });

  it("normalizes blank notes", () => {
    const prompt = renderCarpetScenePrompt({
      room: "卧室",
      style: "现代简约",
      space: "小空间",
      light: "柔和暖光",
      view: "正面视角",
      productShare: 55,
      includePeopleOrPets: true,
      notes: "   ",
    });

    expect(prompt).toContain("补充要求：无额外要求");
    expect(prompt).toContain("允许自然的人物或宠物出现");
  });
});
