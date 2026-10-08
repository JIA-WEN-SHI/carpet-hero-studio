export type WorkbenchStep = "import" | "process" | "scene" | "adjust";

export const workbenchSteps: Array<{
  id: WorkbenchStep;
  title: string;
  description: string;
}> = [
  { id: "import", title: "导入商品", description: "导入商品素材与需求" },
  { id: "process", title: "产品处理", description: "清洗产品图" },
  { id: "scene", title: "场景生成", description: "选择场景并生成方案" },
  { id: "adjust", title: "首图调整", description: "调整细节与构图" },
];

export function getNextStep(step: WorkbenchStep): WorkbenchStep {
  const index = workbenchSteps.findIndex((item) => item.id === step);
  return workbenchSteps[Math.min(index + 1, workbenchSteps.length - 1)].id;
}

export function getPreviousStep(step: WorkbenchStep): WorkbenchStep {
  const index = workbenchSteps.findIndex((item) => item.id === step);
  return workbenchSteps[Math.max(index - 1, 0)].id;
}

export function getStepCompletion(step: WorkbenchStep): number {
  return (workbenchSteps.findIndex((item) => item.id === step) + 1) * 25;
}
