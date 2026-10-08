export interface ScenePromptParameters {
  room: string;
  style: string;
  space: string;
  light: string;
  view: string;
  productShare: number;
  includePeopleOrPets: boolean;
  notes: string;
}

export const CARPET_SCENE_PROMPT_TEMPLATE = `执行一次严格的地毯场景替换任务。
第一张图是产品地毯，是产品真实性的唯一依据；第二张图是目标场景，只用于参考空间构图、家具、陈设、光线、地毯位置、大小和透视。
请移除第二张图中的原地毯，并把第一张图的产品地毯自然放入相同位置。必须保持产品的图案、颜色、材质、绒面细节、边缘、形状和长宽比例，不得混入参考场景原地毯的样式。
让产品匹配目标场景的地面透视、接触阴影、光线方向和色温，但不要改变产品本身的颜色。
房间类型：{{room}}；场景风格：{{style}}；空间大小：{{space}}；光线：{{light}}；画面视角：{{view}}；产品占画面约 {{productShare}}%。
人物或宠物：{{peopleOrPets}}。
补充要求：{{notes}}。
只输出一张 1:1 的真实电商场景图。不要生成文字、水印、价格或营销标签，不要继承参考图中的任何文字、徽标或边框。`;

export function renderCarpetScenePrompt(parameters: ScenePromptParameters): string {
  const values: Record<string, string> = {
    room: parameters.room.trim(),
    style: parameters.style.trim(),
    space: parameters.space.trim(),
    light: parameters.light.trim(),
    view: parameters.view.trim(),
    productShare: String(parameters.productShare),
    peopleOrPets: parameters.includePeopleOrPets
      ? "允许自然的人物或宠物出现，但不得遮挡地毯"
      : "不要出现人物或宠物",
    notes: parameters.notes.trim() || "无额外要求",
  };

  return CARPET_SCENE_PROMPT_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}
