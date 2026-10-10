import { Image, Sparkles } from "lucide-react";

export const sceneGenerationStages = ["准备三个角度的构图", "统一家具与周边陈设", "调整光线，整理三张无字场景"];

export function SceneGenerationPreview({ generating, stage, generate, disabled }: {
  generating: boolean; stage: number; generate(): void; disabled: boolean;
}) {
  const progress = [15, 50, 85][stage];
  return <div className="demo-scene-pending" aria-busy={generating}>
    <div className={`demo-generation-placeholder ${generating ? "running" : ""}`}><Image size={42} /><strong>{generating ? "场景生成中" : "场景待生成"}</strong><span>1:1 · 无字场景</span></div>
    {generating ? <>
      <div className="demo-generation-status" role="status" aria-live="polite"><Sparkles size={18} /><strong>{sceneGenerationStages[stage]}</strong><span>{progress}%</span></div>
      <div className="demo-generation-track" role="progressbar" aria-label="场景生成演示进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div>
      <p className="muted">正在演示场景制作过程，完成后展示图片。</p>
    </> : <><p>沿用第一步主图的风格，每次生成三个角度场景，重新生成换另外三张；每张沿用对应参考图的地毯角度，只修改周边家具。</p><button className="button primary" disabled={disabled} onClick={generate}><Sparkles size={17} />生成场景</button></>}
    <small>约 4 秒的过程示意，完成后同时载入三张预制场景图。</small>
  </div>;
}
