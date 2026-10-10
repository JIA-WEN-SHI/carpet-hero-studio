import type { Dispatch } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { DemoAction, DemoState } from "./demo-state";
import { getOwnScene, getOwnSku, ownAngles } from "./own-products";
import { SceneGenerationPreview } from "./SceneGenerationPreview";

export function OwnSceneWorkspace({ state, dispatch, generating, generate, generateExample, generateScene, sceneGenerationStage, next }: {
  state: DemoState; dispatch: Dispatch<DemoAction>; generating: boolean; generate(): void; generateExample(): void; generateScene(): void; sceneGenerationStage: number; next(): void;
}) {
  const scene = getOwnScene(state.tone, state.sceneId, state.sceneBatch);
  const sku = getOwnSku(state.skuId);
  const useExampleSku = state.skuId !== "own-1";
  const fusionBlocker = !state.scenePrompt.trim() ? "场景提示词为空，请填写或恢复场景模板。"
    : !state.sceneGenerated ? "请先生成场景，查看结果后再采用并融合。"
    : !state.scenePrepared ? "请先点击“采用场景，进入融合”；更换场景后需要重新采用。"
    : !state.prompt.trim() ? "融合提示词为空，请填写或恢复融合模板。" : "";
  return <div className="demo-scene-grid demo-own-scene">
    <aside className="panel">
      <h2>自己的产品图</h2><img className="demo-small-product" src={sku.url} alt={sku.label} />
      <strong className="demo-product-name">{state.productName}</strong><p className="muted">{sku.features}</p>
      <details className="demo-reference-origin"><summary>第一步的参考主图</summary><img className="demo-small-product" src={state.mainReferenceUrl} alt="第一步选定的原主图，仅作画面参考" /><p className="muted">{state.mainReferenceName} · 当前演示按六张原图分别制作场景</p></details>
      <h3>当前家具风格</h3>
      <div className="demo-tone-locked"><strong>{scene.theme}</strong><p className="muted">沿用第一步主图的风格，如需更换请回到“上传主图”。</p></div>
      <p className="muted" data-testid="scene-batch">第 {state.sceneBatch + 1} / 2 组 · 每组三张，共六张</p>
      <h3>{state.sceneGenerated ? "已生成 3 张 · 选一张融合" : "三个角度 · 一次生成"}</h3>
      <div className="demo-scene-options demo-angle-options">{ownAngles.map((angle) => <button key={angle.id} aria-label={getOwnScene(state.tone, angle.id, state.sceneBatch).angleName} aria-pressed={state.sceneId === angle.id} className={state.sceneId === angle.id ? "selected" : ""} disabled={generating} onClick={() => dispatch({ type: "scene", id: angle.id })}>{state.sceneGenerated ? <img src={getOwnScene(state.tone, angle.id, state.sceneBatch).previewUrl} alt="" /> : <div className="demo-angle-placeholder"><Sparkles size={20} /><small>待生成</small></div>}<span>{getOwnScene(state.tone, angle.id, state.sceneBatch).angleName}{state.sceneId === angle.id && <Check size={14} />}</span></button>)}</div>
    </aside>
    <section className="panel">
      <div className="panel-title"><div><h2>{state.sceneGenerated && state.result ? "地毯融合结果" : "场景生成"}</h2><p>{scene.name} · 角度按参考图锁定 · 1:1</p></div><span className="tag warm">模拟案例</span></div>
      {state.sceneGenerated ? <div className="demo-hero-frame"><img className={state.result ? "demo-fusion-preview" : "demo-scene-template"} src={state.result?.imageUrl ?? scene.previewUrl} alt={state.result ? "自己的地毯与选定场景融合后的主图" : scene.name} /></div> : <SceneGenerationPreview generating={generating} stage={sceneGenerationStage} generate={generateScene} disabled={!state.scenePrompt.trim()} />}
      <div className="demo-result-status" role="status">{!state.sceneGenerated ? "点击一次生成三个场景，完成后选一张采用并融合" : state.result ? "已载入 1 张融合案例，可进入交付保存" : state.scenePrepared ? "场景已采用，下一步融合自己的地毯" : "已生成 3 张场景，点击左侧切换查看，选一张采用并进入融合"}</div>
      {state.sceneGenerated && <div className="demo-scene-primary-action">{state.result ? <button className="button primary wide" onClick={next}>查看最终首图 <ArrowRight size={17} /></button> : <button className="button primary wide" disabled={generating || !state.prompt.trim() || !state.scenePrompt.trim()} onClick={useExampleSku ? generateExample : generate}><Sparkles size={17} />{useExampleSku ? "使用 SKU 01 演示成图" : "生成首图并查看"}</button>}<p className="muted">{useExampleSku ? "当前款式暂无预制成图；点击后将切换为 SKU 01，保留当前场景并展示生成过程。" : "自动采用当前场景，展示约 5 秒的融合过程，再进入首图交付。"}</p></div>}
      <div className="demo-input-pair"><div><img src={sku.url} alt="融合输入：自己的 SKU" /><span>产品图</span></div><span>＋</span><div>{state.sceneGenerated ? <img src={scene.previewUrl} alt="融合输入：选中的场景" /> : <div className="demo-angle-placeholder"><Sparkles size={20} /><small>场景待生成</small></div>}<span>场景图</span></div></div>
      <p className="muted">展示使用预先制作的无字方图。修改提示词会保存到方案，本次演示不会重新生图。当前风格共六张，按你提供的六张角度图制作，细节可能有偏差。两批交替展示，不是无限实时生成。</p>
      <a className="text-button" href={scene.referenceUrl} target="_blank" rel="noreferrer">查看原始角度参考</a>
    </section>
    <aside className="panel demo-settings">
      <h2>① 场景方案</h2><p className="muted">每次生成当前风格的三张场景；重新生成换另外三张，选一张进入融合。</p>
      <fieldset disabled={generating} className="demo-fieldset">
        <label className="field"><span className="field-label">场景生成提示词</span><textarea aria-label="场景生成提示词" rows={7} value={state.scenePrompt} onChange={(event) => dispatch({ type: "scenePrompt", text: event.target.value })} /></label>
        <button className="text-button" onClick={() => dispatch({ type: "resetScenePrompt" })}>恢复场景模板</button>
      </fieldset>
      <button className="button primary wide" disabled={generating || !state.scenePrompt.trim()} onClick={generateScene}><Sparkles size={17} />{generating ? "场景生成中…" : state.sceneGenerated ? "重新生成场景" : "生成场景"}</button>
      <p className="muted">重新生成会清除当前采用状态；演示素材分两组循环显示。</p>
      <button className="button secondary wide demo-next-button" disabled={generating || !state.sceneGenerated || !state.scenePrompt.trim()} onClick={() => dispatch({ type: "prepareScene" })}>{state.scenePrepared && <Check size={16} />}采用场景，进入融合</button>
      <hr className="demo-stage-divider" />
      <h2>② 地毯融合</h2><p className="muted">自己的产品图 + 已采用的场景图，每次一张。</p>
      <fieldset disabled={generating} className="demo-fieldset">
        <label className="field"><span className="field-label">地毯融合提示词</span><textarea aria-label="地毯融合提示词" rows={9} value={state.prompt} onChange={(event) => dispatch({ type: "prompt", text: event.target.value })} /></label>
        <button className="text-button" onClick={() => dispatch({ type: "resetPrompt" })}>恢复融合模板</button>
        {(state.promptDirty || state.scenePromptDirty) && <p className="muted">手动修改会保留；恢复模板可带入当前产品和场景。</p>}
      </fieldset>
      {useExampleSku && <p className="demo-business-note">{sku.label} 暂无预制融合图。下方按钮会明确切换为 SKU 01 · 黑边米白款，并保留你选择的深浅方案和角度。</p>}
      <p id="demo-fusion-help" className="muted" role="status">{fusionBlocker || (useExampleSku ? "场景已采用，可切换到可用示例继续融合。" : "场景已采用，可以融合一张首图。")}</p>
      <button className="button primary wide" aria-describedby="demo-fusion-help" disabled={generating || Boolean(fusionBlocker)} onClick={useExampleSku ? generateExample : generate}><Sparkles size={17} />{generating ? "融合案例加载中" : useExampleSku ? "切换 SKU 01 并继续融合" : "模拟融合一张"}</button>
      <button className="button secondary wide demo-next-button" disabled={!state.result || !state.sceneGenerated || generating} onClick={next}>采用此方案，下一步 <ArrowRight size={17} /></button>
    </aside>
  </div>;
}

export function OwnSceneLibrary() {
  return <><div className="page-heading"><div><h2>风格与场景库</h2><p>你提供的六张案例参考 · 客厅全景使用之前调整好的 1:1 无字版</p></div></div>
    {(["dark", "light"] as const).map(tone => <section className="demo-library-group" key={tone}>
      <h3>{tone === "dark" ? "深色参考" : "浅色参考"} · 原始案例</h3>
      <div className="demo-library-grid">{ownAngles.map(angle => {
        const scene = getOwnScene(tone, angle.id);
        const adjusted = tone === "light" && angle.number === 3;
        const imageUrl = adjusted ? scene.previewUrl : scene.referenceUrl;
        const label = adjusted ? "调整后参考图" : "原始参考图";
        return <article className="panel demo-library-card demo-original-reference" key={angle.id}>
          <img src={imageUrl} alt={`${label} · ${scene.theme} · ${scene.angleName}`} loading="lazy" />
          <h3>{scene.angleName}</h3><p>{adjusted ? "使用之前调整好的 1:1 无字方图，保留完整画面。" : "原图保留，用于参考地毯角度、构图与周边家具。"}</p>
          <span className="tag">{label}</span>
          <a className="button secondary wide" href={imageUrl} target="_blank" rel="noreferrer">{adjusted ? "查看大图" : "查看原图"} <ArrowRight size={16} /></a>
        </article>;
      })}</div>
    </section>)}
  </>;
}
