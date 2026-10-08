import { describe, expect, it } from "vitest";
import { initialPromptState, reducePromptState } from "./prompt-state";

describe("prompt state", () => {
  it("accepts template updates before the user edits", () => {
    const state = reducePromptState(initialPromptState("A"), { type: "template", value: "B" });
    expect(state).toEqual({ text: "B", dirty: false });
  });

  it("protects user edits from later template updates", () => {
    const edited = reducePromptState(initialPromptState("A"), { type: "edit", value: "custom" });
    expect(reducePromptState(edited, { type: "template", value: "B" }).text).toBe("custom");
  });

  it("restores the latest template", () => {
    const edited = reducePromptState(initialPromptState("A"), { type: "edit", value: "custom" });
    expect(reducePromptState(edited, { type: "reset", value: "B" }))
      .toEqual({ text: "B", dirty: false });
  });
});
