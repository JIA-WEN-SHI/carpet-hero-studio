import { describe, expect, it } from "vitest";
import {
  getNextStep,
  getPreviousStep,
  getStepCompletion,
  type WorkbenchStep,
} from "./workflow";

describe("workbench workflow", () => {
  it("moves through the four production steps", () => {
    expect(getNextStep("import")).toBe("process");
    expect(getNextStep("process")).toBe("scene");
    expect(getNextStep("scene")).toBe("adjust");
    expect(getNextStep("adjust")).toBe("adjust");
  });

  it("does not move before the first step", () => {
    expect(getPreviousStep("import")).toBe("import");
    expect(getPreviousStep("adjust")).toBe("scene");
  });

  it.each<[WorkbenchStep, number]>([
    ["import", 25],
    ["process", 50],
    ["scene", 75],
    ["adjust", 100],
  ])("returns completion for %s", (step, completion) => {
    expect(getStepCompletion(step)).toBe(completion);
  });
});
