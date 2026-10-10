import { useEffect, useReducer, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Download, Play, RotateCcw, Sparkles, X } from "lucide-react";
import { DEMO_STORAGE_KEY, readDemoState, reduceDemoState, type DemoResult, type DemoSceneId } from "./demo-state";
import { demoCases, getDemoCase, type DemoCaseId } from "./demo-cases";
import type { WorkbenchStep } from "../../workflow";
import { getOwnScene, getOwnSku, ownSkus, mainReferences } from "./own-products";
import { OwnSceneLibrary, OwnSceneWorkspace } from "./OwnSceneWorkspace";
import { DemoGeneration, generationStages } from "./DemoGeneration";
import { MainReferenceInput } from "./MainReferenceInput";
import { sceneGenerationStages } from "./SceneGenerationPreview";
import "./demo.css";

type DemoView = "workbench" | "projects" | "completed" | "scenes";
type DemoWorkspaceProps = { view: DemoView; setView(view: DemoView): void; onExit(): void };

export function DemoWorkspace(props: DemoWorkspaceProps) {
  const [caseId, setCaseId] = useState<DemoCaseId>("33");
  useEffect(() => {
    try { window.localStorage.setItem(`${DEMO_STORAGE_KEY}-active`, caseId); } catch { /* The current tab still works without local storage. */ }
  }, [caseId]);
  return <DemoCaseWorkspace key={caseId} {...props} caseId={caseId} onCaseSelect={(id) => { setCaseId(id); props.setView("workbench"); }} />;
}
const steps: { id: WorkbenchStep; title: string; description: string }[] = [
  { id: "import", title: "上传主图", description: "确定画面参考与需求" },
  { id: "process", title: "产品确认", description: "选择自己的 SKU 地毯" },
  { id: "scene", title: "场景生成", description: "选择参考并编辑提示词" },
  { id: "adjust", title: "首图交付", description: "检查画面并保存成品" },
];

function ResultDetails({ result, onClose }: { result: DemoResult; onClose(): void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={dialogRef} className="demo-dialog" aria-label="演示首图交付详情" onCancel={onClose}>
    <div className="panel-title"><div><h2>首图交付</h2><p>已保存的演示作品与生成记录</p></div><button className="icon-button" aria-label="关闭详情" onClick={onClose}><X size={18} /></button></div>
    <div className="demo-detail-grid">
      <img src={result.imageUrl} alt={result.productName} style={{ filter: `brightness(${100 + result.brightness}%)` }} />
      <div><span className="tag warm">用户素材 · 模拟案例</span><h3>{result.productName}</h3><p>{result.sceneName} · {result.width} × {result.height}</p><p>保存时间：{new Date(result.createdAt).toLocaleString("zh-CN")}</p>
        {result.scenePrompt && <label className="field"><span className="field-label">保存的场景提示词</span><textarea aria-label="保存的场景提示词" readOnly value={result.scenePrompt} rows={5} /></label>}
        <label className="field"><span className="field-label">{result.caseId === "33" ? "保存的地毯融合提示词（模拟记录）" : "本次使用的提示词"}</span><textarea aria-label="保存的地毯融合提示词" readOnly value={result.prompt} rows={10} /></label>
        <a className="button primary wide" href={result.imageUrl} download={`DEMO-${result.caseId}-hero.${result.imageUrl.endsWith(".png") ? "png" : "jpg"}`}><Download size={16} /> 下载示例图片</a>
        <p className="muted">亮度滑杆用于展示画面预览；下载文件为当前案例素材。</p>
      </div>
    </div>
  </dialog>;
}

function DemoCaseWorkspace({ view, setView, onExit, caseId, onCaseSelect }: DemoWorkspaceProps & { caseId: DemoCaseId; onCaseSelect(id: DemoCaseId): void }) {
  const [state, dispatch] = useReducer(reduceDemoState, undefined, () => {
    try { return readDemoState(window.localStorage, caseId); } catch { return readDemoState(undefined, caseId); }
  });
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [details, setDetails] = useState(false);
  const [detailResult, setDetailResult] = useState<DemoResult>();
  const [query, setQuery] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [checks, setChecks] = useState([true, true, true]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const baseCase = getDemoCase(state.caseId);
  const ownSku = getOwnSku(state.skuId);
  const demoCase = state.caseId === "33" ? { ...baseCase, productUrl: ownSku.url, features: ownSku.features,
    preserve: [ownSku.features, "原有颜色与比例", "长方形形状"],
    checks: [ownSku.features, "保留地毯原有纹理与颜色", "保留产品的长方形形状与比例"] } : baseCase;
  const demoScenes = demoCase.scenes;
  const completedResults = state.completed && state.completed.caseId === "33" && !state.completed.id.startsWith("demo-case-")
    ? [state.completed] : [];
  const currentScene = demoScenes.find((scene) => scene.id === state.sceneId)!;
  const activeIndex = steps.findIndex((item) => item.id === state.step);
  const pageTitles = { workbench: "首图工作台", projects: "选品项目", completed: "已完成首图", scenes: "风格与场景库" };

  useEffect(() => {
    if (!state.caseSeeded) dispatch({ type: "loadCase" });
  }, [state.caseSeeded]);

  useEffect(() => {
    try { window.localStorage.setItem(`${DEMO_STORAGE_KEY}-${state.caseId}`, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const go = (step: WorkbenchStep) => { dispatch({ type: "step", step }); setView("workbench"); };
  const startGeneration = (useExampleSku = false) => {
    if (generating || !state.prompt.trim()) return;
    if (caseId === "33") {
      if ((!useExampleSku && state.skuId !== "own-1") || !state.scenePrompt.trim() || !state.sceneGenerated) return;
      if (useExampleSku) dispatch({ type: "sku", id: "own-1" });
      dispatch({ type: "prepareScene" });
      go("adjust");
      setGenerating(true);
      setGenerationStage(0);
      let stage = 0;
      const advance = () => {
        stage += 1;
        if (stage < generationStages.length) {
          setGenerationStage(stage);
          timerRef.current = setTimeout(advance, 1200);
        } else {
          dispatch({ type: "generate", at: new Date().toISOString() });
          setGenerating(false);
          timerRef.current = undefined;
        }
      };
      timerRef.current = setTimeout(advance, 1200);
      return;
    }
    setGenerating(true);
    timerRef.current = setTimeout(() => {
      dispatch({ type: "generate", at: new Date().toISOString() });
      setGenerating(false);
    }, 1200);
  };
  const generate = () => startGeneration();
  const generateExample = () => startGeneration(true);
  const generateScene = () => {
    if (generating || !state.scenePrompt.trim()) return;
    dispatch({ type: "startSceneGeneration" });
    go("scene");
    setGenerating(true); setGenerationStage(0);
    let stage = 0;
    const advance = () => {
      stage += 1;
      if (stage < sceneGenerationStages.length) {
        setGenerationStage(stage);
        timerRef.current = setTimeout(advance, 1200);
      } else {
        dispatch({ type: "sceneGenerated" });
        setGenerating(false); timerRef.current = undefined;
      }
    };
    timerRef.current = setTimeout(advance, 1200);
  };
  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setGenerating(false); setDetails(false); setChecks([true, true, true]);
    dispatch({ type: "reset" }); setView("workbench");
  };
  const selectScene = (id: DemoSceneId) => { dispatch({ type: "scene", id }); };

  return <>
    <header className="topbar">
      <div className="topbar-title"><h1>{pageTitles[view]}</h1><span className="tag warm">展示案例</span></div>
      <div className="topbar-actions"><span className="autosave"><CheckCircle2 size={16} />{storageError ? "仅当前页面保存" : "演示进度已保存"}</span><button className="button secondary" onClick={reset}><RotateCcw size={16} /> 重新演示</button><button className="text-button" onClick={onExit}>退出演示</button></div>
    </header>
    <main className="page demo-page">

      {view === "workbench" && <>
        <nav className="stepper" aria-label="演示流程">
          {steps.map((item, index) => <button type="button" key={item.id} className={`step ${index === activeIndex ? "active" : ""} ${index < activeIndex ? "done" : ""}`} aria-current={index === activeIndex ? "step" : undefined} disabled={generating || (item.id === "adjust" && !state.result && caseId !== "33")} onClick={() => go(item.id)}>
            <span className="step-number">{index < activeIndex ? <Check size={16} /> : index + 1}</span><span><strong>{caseId === "22" && item.id === "import" ? "导入商品" : item.title}</strong><small>{caseId === "22" && item.id === "import" ? "查看预填商品与需求" : item.description}</small></span>
          </button>)}
        </nav>

        {state.step === "import" && <div className="demo-two-column">
          {caseId === "33" ? <MainReferenceInput url={state.mainReferenceUrl} name={state.mainReferenceName} images={mainReferences} onChange={(url, name) => dispatch({ type: "mainReference", url, name })} /> : <section className="panel"><div className="panel-title"><div><h2>运营选品案例</h2><p>从候选商品中收集一张产品图，交给设计制作新主图</p></div><span className="tag green">素材已准备</span></div>
            <div className="demo-product-layout"><div className="demo-product-image"><img src={demoCase.productUrl} alt={demoCase.name} /><span className="tag">产品依据 · {demoCase.productLabel}</span></div>
              <div><label className="field"><span className="field-label">商品名称</span><input value={state.productName} onChange={(event) => dispatch({ type: "product", name: event.target.value, direction: state.direction })} /></label>
                <dl className="demo-facts"><div><dt>来源店铺</dt><dd>{demoCase.store}</dd></div><div><dt>参考价格</dt><dd>{demoCase.price}</dd></div><div><dt>素材来源</dt><dd>{demoCase.source}</dd></div><div><dt>产品特征</dt><dd>{demoCase.features}</dd></div><div><dt>内部编号</dt><dd>{demoCase.sku}</dd></div><div><dt>协作人员</dt><dd>{demoCase.owner}</dd></div></dl>
                <div className="summary-box"><strong>运营选品理由</strong><p>{demoCase.reason}</p></div>
              </div>
            </div>
            <div className="section-heading"><strong>已嵌入的商品素材</strong><span>{demoCase.images.length} 张 · 点击查看图片</span></div>
            <div className="demo-source-gallery">{demoCase.images.map((image) => <a key={image.url} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.label} loading="lazy" /><span>{image.label}</span></a>)}</div>
          </section>}
          <aside className="panel"><div className="panel-title"><div><h2>首图设计需求</h2><p>设计师接收的本次测试目标</p></div></div>
            <label className="field"><span className="field-label">测试方向</span><textarea rows={4} value={state.direction} onChange={(event) => dispatch({ type: "product", name: state.productName, direction: event.target.value })} /></label>
            <label className="field"><span className="field-label">意向风格</span><div className="read-box">{caseId === "33" ? getOwnScene(state.tone, state.sceneId, state.sceneBatch).name : `${currentScene.style} · 客厅 · 自然光`}</div></label>
            <div className="field"><span className="field-label">{caseId === "33" ? "主图参考重点" : "产品必须保留"}</span><div className="tags">{(caseId === "33" ? ["地毯角度", "铺设位置", "画面构图", "场景布局"] : demoCase.preserve).map((item) => <span className="tag" key={item}>{item}</span>)}</div></div>
            <div className="summary-box"><strong>可以调整的内容</strong><p>{caseId === "33" ? "背景、沙发与家具、光线、周边摆件。地毯角度、位置和透视按参考图锁定。" : "背景、沙发与家具、光线、周边摆件、拍摄角度。"}</p></div>
            <div className="demo-business-note"><strong>测试假数据</strong><p>原首图点击率 2.1% · 测试目标 3.0%<br />测试预算 ¥200 · 计划周期 7 天</p></div>
            <button className="button primary wide" onClick={() => go("process")}>确认素材，下一步 <ArrowRight size={17} /></button>
          </aside>
        </div>}

        {state.step === "process" && <div className="demo-two-column">
          <section className="panel"><div className="panel-title"><div><h2>确认产品图</h2><p>{caseId === "33" ? "第二步：选择自己的 SKU 地毯样式，作为最终融合的产品依据" : "本次使用已准备的产品图作为生成依据"}</p></div></div><div className="demo-product-confirm"><img src={demoCase.productUrl} alt="待确认的产品地毯" /></div>
            {caseId === "33" && <><div className="section-heading"><strong>自己的 SKU 产品图</strong><span>选择本次使用的地毯样式</span></div><div className="demo-sku-picker">{ownSkus.map((sku) => <button key={sku.id} aria-pressed={state.skuId === sku.id} className={state.skuId === sku.id ? "selected" : ""} onClick={() => { dispatch({ type: "sku", id: sku.id }); setChecks([true, true, true]); }}><img src={sku.url} alt="" /><span>{sku.label}</span></button>)}</div><label className="field"><span className="field-label">商品名称</span><input value={state.productName} onChange={(event) => dispatch({ type: "product", name: event.target.value, direction: state.direction })} /></label></>}
          </section>
          <aside className="panel"><h2>产品特征检查</h2><p className="muted">确认需要在新场景里保留的产品信息</p>
            {demoCase.checks.map((text, index) => <label key={text} className="suggestion"><span><strong>{text}</strong><small>生成时作为保留约束</small></span><input type="checkbox" checked={checks[index]} onChange={(event) => setChecks((items) => items.map((value, i) => i === index ? event.target.checked : value))} /></label>)}
            <div className="summary-box"><strong>当前处理方式</strong><p>直接采用准备好的产品图，进入场景选择与主图制作。</p></div><button className="button primary wide" disabled={!checks.every(Boolean)} onClick={() => go("scene")}>确认产品，进入场景 <ArrowRight size={17} /></button>
          </aside>
        </div>}

        {state.step === "scene" && caseId === "33" && <OwnSceneWorkspace state={state} dispatch={dispatch} generating={generating} generate={generate} generateExample={generateExample} generateScene={generateScene} sceneGenerationStage={generationStage} next={() => go("adjust")} />}
        {state.step === "scene" && caseId !== "33" && <div className="demo-scene-grid">
          <aside className="panel"><h2>产品与意向参考</h2><img className="demo-small-product" src={demoCase.productUrl} alt="生成使用的产品图" /><strong className="demo-product-name">{state.productName}</strong><p className="muted">1 张产品图 + 1 张选中的场景参考图</p><h3>推荐场景 · 三选一</h3>
            <div className="demo-scene-options">{demoScenes.map((scene) => <button key={scene.id} aria-pressed={state.sceneId === scene.id} disabled={generating} className={state.sceneId === scene.id ? "selected" : ""} onClick={() => selectScene(scene.id)}><img src={scene.previewUrl} alt="" /><span>{scene.name}{state.sceneId === scene.id && <Check size={14} />}</span></button>)}</div>
          </aside>
          <section className="panel demo-preview-panel"><div className="panel-title"><div><h2>{state.result ? "模拟首图结果" : "当前场景参考"}</h2><p>{state.result ? `案例主图 · ${state.result.width} × ${state.result.height} · 保留素材比例` : currentScene.details}</p></div><span className="tag warm">演示</span></div>
            <div className="demo-hero-frame" style={{ aspectRatio: state.result ? `${state.result.width} / ${state.result.height}` : "1" }}><img src={state.result?.imageUrl ?? currentScene.previewUrl} alt={state.result ? "模拟生成的地毯首图" : "当前选中的意向场景"} />{generating && <div className="demo-generating"><Sparkles size={28} /><strong>模拟生成中…</strong><span>选择参考 · 记录提示词 · 展示示例成图</span></div>}</div>
            <div className="demo-result-status" role="status">{generating ? "正在演示生成过程" : state.result?.id.startsWith("demo-case-") ? "已放入案例成图，可直接进入交付，也可修改提示词再模拟生成" : state.result ? "已生成 1 张演示候选图，可以进入首图交付" : "选择场景并检查右侧提示词，然后点击“模拟生成一张”"}</div>
            <div className="info-callout"><CheckCircle2 size={17} /><span>模拟结果使用预置案例素材；场景选择和提示词保存在方案中，本次模拟生成未调用生图模型。</span></div>
          </section>
          <aside className="panel demo-settings"><h2>场景设置与提示词</h2><fieldset disabled={generating} className="demo-fieldset">
            <label className="field"><span className="field-label">光线氛围</span><select value={state.light} onChange={(event) => dispatch({ type: "settings", light: event.target.value })}><option>明亮柔和的自然光</option><option>温暖的黄昏光线</option><option>有层次的柔和侧光</option></select></label>
            <label className="field"><span className="field-label">画面视角</span><select value={state.angle} onChange={(event) => dispatch({ type: "settings", angle: event.target.value })}><option>45° 斜角视角</option><option>正面视角</option><option>轻俯视视角</option></select></label>
            <label className="field"><span className="field-label">产品占比 {state.share}%</span><input type="range" min={45} max={80} value={state.share} onChange={(event) => dispatch({ type: "settings", share: Number(event.target.value) })} /></label>
            <label className="field"><span className="field-label">生成提示词 {state.promptDirty && <span className="tag warm">已手动修改</span>}</span><textarea rows={11} value={state.prompt} onChange={(event) => dispatch({ type: "prompt", text: event.target.value })} /></label>
            <button className="text-button demo-reset-prompt" onClick={() => dispatch({ type: "resetPrompt" })}><RotateCcw size={14} /> 恢复默认模板</button>
            {state.promptDirty && <p className="muted">手动提示词会保留；恢复模板可重新带入场景设置。</p>}
          </fieldset><button className="button primary wide" disabled={generating || !state.prompt.trim()} onClick={generate}><Sparkles size={17} />{generating ? "模拟生成中…" : state.result && !state.result.id.startsWith("demo-case-") ? "再模拟生成一张" : "模拟生成一张"}</button>
            <button className="button secondary wide demo-next-button" disabled={!state.result || generating} onClick={() => go("adjust")}>采用此方案，下一步 <ArrowRight size={17} /></button>
          </aside>
        </div>}

        {state.step === "adjust" && caseId === "33" && (!state.result || generating) && <DemoGeneration state={state} generating={generating} stage={generationStage} generate={generate} editScene={() => go("scene")} chooseExample={() => { dispatch({ type: "sku", id: "own-1" }); go("adjust"); }} />}
        {state.step === "adjust" && state.result && !generating && <div className="demo-two-column">
          <section className="panel"><div className="panel-title"><div><h2>首图检查与交付</h2><p>{caseId === "33" ? "自己的地毯与推荐场景融合 · 无字方图 · 预制案例" : "用户提供的原主图，展示模拟交付流程"}</p></div><span className="tag">{state.result.width} × {state.result.height}</span></div><img className="demo-final-preview" src={state.result.imageUrl} alt="待交付的地毯主图" style={{ filter: `brightness(${100 + state.brightness}%)` }} /></section>
          <aside className="panel"><h2>{state.result.productName}</h2><p className="muted">{state.result.sceneName} · 方案 A</p><div className="quality-list">{["原始图片已嵌入", "产品纹理可查看", "场景家具可辨识", "原图尺寸已记录", "提示词随方案保存"].map((item) => <div key={item}><CheckCircle2 size={17} />{item}</div>)}</div>
            <label className="field"><span className="field-label">亮度预览 {state.brightness > 0 ? "+" : ""}{state.brightness}%</span><input type="range" min={-20} max={20} value={state.brightness} onChange={(event) => dispatch({ type: "brightness", value: Number(event.target.value) })} /></label><p className="muted">此处演示画面亮度调整，交付记录保留预览设置。</p>
            <div className="delivery-box"><strong>首图交付 · 模拟版本</strong><p>{demoCase.sku}_hero.{state.result.imageUrl.endsWith(".png") ? "png" : "jpg"}<br />{state.result.width} × {state.result.height} · {state.result.imageUrl.endsWith(".png") ? "PNG" : "JPG"} · 案例素材</p><button className="button primary wide" onClick={() => { dispatch({ type: "complete" }); setView("completed"); }}><CheckCircle2 size={17} /> 完成并保存首图</button></div>
            {caseId === "33" && <button className="button secondary wide demo-next-button" onClick={generate}><Play size={16} />再看一次生成过程</button>}
          </aside>
        </div>}
        <div className="step-footer"><button className="text-button" disabled={activeIndex === 0 || generating} onClick={() => go(steps[Math.max(0, activeIndex - 1)].id)}><ArrowLeft size={16} /> 上一步</button><span>第 {activeIndex + 1} / 4 步 · 演示进度保存在本浏览器</span></div>
      </>}

      {view === "projects" && <><div className="page-heading"><div><h2>选品项目</h2><p>自己的地毯产品，点击继续首图制作</p></div></div><div className="demo-project-list">{demoCases.filter(item => item.id === "33").map((item) => <article className="panel demo-project-card" key={item.id}><img src={item.productUrl} alt={item.name} /><div><span className="tag green">用户素材 · 已预填</span><h3>{item.id === state.caseId ? state.productName : item.name}</h3><p>{item.source} · {item.price}</p><p>{item.id === state.caseId ? state.direction : item.direction}</p><p className="muted">{item.owner}</p><button className="button primary" onClick={() => onCaseSelect(item.id)}>载入此案例 <ArrowRight size={16} /></button></div></article>)}</div></>}

      {view === "completed" && <><div className="page-heading"><div><h2>已完成首图</h2><p>确认保存后的首图，可查看提示词与下载图片</p></div><div className="search-box"><input aria-label="搜索演示作品" placeholder="搜索商品名称" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
        {completedResults.some((item) => item.productName.includes(query.trim())) ? <div className="completed-grid">{completedResults.filter((item) => item.productName.includes(query.trim())).map((result) => <article className="completed-card" key={result.id}><button className="completed-card-open" onClick={() => { setDetailResult(result); setDetails(true); }} aria-label={`查看 ${result.productName} 详情`}><img src={result.imageUrl} alt="已完成的演示首图" style={{ filter: `brightness(${100 + result.brightness}%)` }} /><div><span className="tag green">已完成 · 模拟</span><h3>{result.productName}</h3><p>{result.sceneName} · {result.width} × {result.height}</p></div></button><footer><span>已保存到本浏览器</span><a href={result.imageUrl} download={`DEMO-${result.caseId}-hero.${result.imageUrl.endsWith(".png") ? "png" : "jpg"}`}>下载示例图片</a></footer></article>)}</div>
          : <div className="panel demo-empty"><Sparkles size={30} /><h3>{state.completed ? "没有找到匹配作品" : "完成流程后，首图将保存在这里"}</h3><p>按顺序确认产品、选择场景、模拟生成，再点击“完成并保存首图”。</p><button className="button primary" onClick={() => setView("workbench")}>继续演示流程 <ArrowRight size={16} /></button></div>}
        {state.completed && <button className="button secondary demo-next-button" onClick={() => { dispatch({ type: "step", step: "scene" }); setView("workbench"); }}>返回工作台继续测试</button>}
      </>}

      {view === "scenes" && (caseId === "33" ? <OwnSceneLibrary /> : <><div className="page-heading"><div><h2>风格与场景库</h2><p>三个推荐意向场景，每次选择一个参考</p></div></div><div className="demo-library-grid">{demoScenes.map((scene) => <article className="panel demo-library-card" key={scene.id}><img src={scene.previewUrl} alt={scene.name} /><h3>{scene.name}</h3><p>{scene.details}</p><span className="tag">{scene.style}</span><button className="button secondary wide" disabled={generating} onClick={() => { selectScene(scene.id); go("scene"); }}>用于首图制作 <ArrowRight size={16} /></button></article>)}</div></>)}
      {details && detailResult && <ResultDetails result={detailResult} onClose={() => setDetails(false)} />}
    </main>
  </>;
}
