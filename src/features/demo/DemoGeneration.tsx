import { ArrowRight, Check, Image, Sparkles } from "lucide-react";
import type { DemoState } from "./demo-state";
import { getOwnScene, getOwnSku } from "./own-products";

export const generationStages = [
  { title: "读取产品与场景", detail: "产品样式图和选定场景一起作为输入" },
  { title: "对齐地毯角度与位置", detail: "沿用场景中的地毯轮廓、透视和铺设位置" },
  { title: "融合纹理、光线与阴影", detail: "替换为自己的地毯花纹，匹配环境光与家具遮挡" },
  { title: "整理无字首图", detail: "展示一张 1:1 成图，准备交付保存" },
];

export function DemoGeneration({ state, generating, stage, generate, chooseExample, editScene }: {
  state: DemoState; generating: boolean; stage: number; generate(): void; chooseExample(): void; editScene(): void;
}) {
  const scene = getOwnScene(state.tone, state.sceneId, state.sceneBatch);
  const sku = getOwnSku(state.skuId);
  const progress = [10, 35, 65, 90][stage];
  const supported = state.skuId === "own-1";
  return <section className="panel demo-generation-panel" aria-busy={generating}>
    <div className="panel-title"><div><h2>{generating ? "正在演示首图生成" : "首图待生成"}</h2><p>{sku.label} · {scene.name} · 1:1</p></div><span className="tag warm">生成过程示意</span></div>
    <div className="demo-generation-inputs">
      <figure><img src={sku.url} alt="本次生成的自有 SKU 产品图" /><figcaption>① 自己的地毯样式</figcaption></figure>
      <span aria-hidden="true">＋</span>
      <figure>{state.sceneGenerated ? <img src={scene.previewUrl} alt="本次选中的推荐场景图" /> : <div className="demo-generation-placeholder"><Image size={30} /><strong>场景待生成</strong></div>}<figcaption>② 选中的场景</figcaption></figure>
      <ArrowRight size={24} aria-hidden="true" />
      <figure><div className={`demo-generation-placeholder ${generating ? "running" : ""}`}><Image size={38} /><strong>{generating ? "融合生成中" : "待生成首图"}</strong><span>1:1 · 无字</span></div><figcaption>③ 自有地毯主图</figcaption></figure>
    </div>
    {generating ? <>
      <div className="demo-generation-status" role="status" aria-live="polite"><Sparkles size={20} /><strong>{generationStages[stage].title}</strong><span>{progress}% · 演示进度</span></div>
      <div className="demo-generation-track" role="progressbar" aria-label="首图生成演示进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div>
    </> : <p className="demo-generation-intro">{state.sceneGenerated ? "产品与场景已准备好。点击下方按钮，观看融合过程，完成后直接显示首图。" : "需要先生成场景，再将自己的地毯融合进去。"}</p>}
    <ol className="demo-generation-stages">{generationStages.map((item, index) => <li key={item.title} className={`demo-generation-stage ${generating && index < stage ? "done" : ""} ${generating && index === stage ? "active" : ""}`} aria-current={generating && index === stage ? "step" : undefined}><span className="demo-generation-number">{generating && index < stage ? <Check size={15} /> : index + 1}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ol>
    <p className="muted">约 5 秒的演示动画，随后展示预制融合图；修改提示词会保存，但本次不调用实时生图。</p>
    {!generating && <div className="demo-generation-actions">
      {!state.sceneGenerated ? <button className="button primary" onClick={editScene}>先生成场景</button> : supported ? <button className="button primary" disabled={!state.prompt.trim() || !state.scenePrompt.trim()} onClick={generate}><Sparkles size={17} />演示生成首图</button> : <><p>此款暂未制作融合成图，可切换到 SKU 01 观看完整生成与交付示例。</p><button className="button primary" onClick={chooseExample}>切换 SKU 01 体验成图</button></>}
      <button className="button secondary" onClick={editScene}>调整场景与提示词</button>
      {supported && (!state.prompt.trim() || !state.scenePrompt.trim()) && <p>请先补全场景与融合提示词。</p>}
    </div>}
  </section>;
}
