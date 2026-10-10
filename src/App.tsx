import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  CloudUpload,
  Crop,
  ExternalLink,
  FolderPlus,
  History,
  Image,
  Images,
  LayoutGrid,
  Maximize2,
  Move,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Upload,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { CarpetArt, RoomScene } from "./art";
import { DemoWorkspace } from "./features/demo/DemoWorkspace";
import { bootstrapProject, createChatgptPrototypeJob, listGenerationResults, renderPrompt } from "./features/scene-generation/api";
import { PromptEditor } from "./features/scene-generation/PromptEditor";
import { initialPromptState, reducePromptState } from "./features/scene-generation/prompt-state";
import { SceneReferences } from "./features/scene-generation/SceneReferences";
import type { GenerationResultView, SceneParameters } from "./features/scene-generation/types";
import { useAssetUpload } from "./features/scene-generation/useAssetUpload";
import { useGenerationJob } from "./features/scene-generation/useGenerationJob";
import { PRODUCT_IMAGE_ACCEPT } from "./features/scene-generation/upload-policy";
import {
  getNextStep,
  getPreviousStep,
  workbenchSteps,
  type WorkbenchStep,
} from "./workflow";

type View = "workbench" | "projects" | "completed" | "scenes";

const projectCards = [
  { name: "复古花卉地毯", style: "奶油风", room: "客厅", status: "设计中", price: "¥129", variant: 0 },
  { name: "棋盘格短绒地毯", style: "现代简约", room: "客厅", status: "待处理", price: "¥89", variant: 3 },
  { name: "焦糖波斯纹地毯", style: "复古美式", room: "卧室", status: "已完成", price: "¥159", variant: 2 },
  { name: "原木色几何地垫", style: "日式原木", room: "入户", status: "待处理", price: "¥69", variant: 1 },
  { name: "灰蓝满铺地毯", style: "轻奢", room: "客厅", status: "设计中", price: "¥199", variant: 3 },
  { name: "奶咖圆形地毯", style: "奶油风", room: "卧室", status: "已完成", price: "¥119", variant: 1 },
];

const sceneStyles = ["奶油风", "现代简约", "复古美式", "日式原木", "轻奢", "自然森系"];

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><Image size={19} /></div>
      <span>地毯首图生产平台</span>
    </div>
  );
}

function Sidebar({ view, setView, onDemo }: { view: View; setView: (view: View) => void; onDemo: () => void }) {
  const items = [
    { id: "workbench" as const, label: "首图工作台", icon: Images },
    { id: "projects" as const, label: "选品项目", icon: Archive },
    { id: "completed" as const, label: "已完成首图", icon: CheckCircle2 },
    { id: "scenes" as const, label: "风格与场景库", icon: Image },
  ];
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="nav-list">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={onDemo}><Sparkles size={19} /><span>展示案例</span></button>
        <button className="nav-item"><CircleHelp size={19} /><span>使用帮助</span></button>
        <div className="profile">
          <div className="avatar">林</div>
          <div><strong>设计师-小林</strong><span>视觉设计组</span></div>
          <ChevronDown size={16} />
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  title,
  onNew,
  onHistory,
}: {
  title: string;
  onNew?: () => void;
  onHistory?: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        {title === "首图工作台" && (
          <button className="project-select">当前项目：复古花卉地毯 <ChevronDown size={15} /></button>
        )}
      </div>
      <div className="topbar-actions">
        <span className="autosave"><CheckCircle2 size={16} /> 已自动保存 <small>14:32</small></span>
        {onNew && <button className="button secondary" onClick={onNew}><FolderPlus size={17} /> 新建项目</button>}
        {onHistory && <button className="button secondary" onClick={onHistory}><History size={17} /> 历史版本</button>}
      </div>
    </header>
  );
}

function Stepper({
  step,
  setStep,
  productAssetId,
}: {
  step: WorkbenchStep;
  setStep: (step: WorkbenchStep) => void;
  productAssetId?: string;
}) {
  const activeIndex = workbenchSteps.findIndex((item) => item.id === step);
  return (
    <div className="stepper">
      {workbenchSteps.map((item, index) => {
        const locked = index > 0 && !productAssetId;
        return (
          <button
            key={item.id}
            className={`step ${index === activeIndex ? "active" : ""} ${index < activeIndex ? "done" : ""}`}
            disabled={locked}
            onClick={() => {
              if (!locked) setStep(item.id);
            }}
          >
            <span className="step-number">{index < activeIndex ? <Check size={16} /> : index + 1}</span>
            <span><strong>{item.title}</strong><small>{item.description}</small></span>
          </button>
        );
      })}
    </div>
  );
}

function Tag({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "warm" | "gray" | "green" }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="field">
      <span className="field-label">{label}{required && <b>*</b>}</span>
      {children}
    </label>
  );
}

export function ImportStep({
  onNext,
  projectId,
  productAssetId,
  productPreviewUrl,
  onProductUploaded,
}: {
  onNext: () => void;
  projectId?: string;
  productAssetId?: string;
  productPreviewUrl?: string;
  onProductUploaded(assetId: string, file: File): void;
}) {
  const [selected, setSelected] = useState(0);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useAssetUpload();
  const uploadProduct = async (file?: File) => {
    if (!file || !projectId) return;
    try {
      const assetId = await upload(projectId, "product", file);
      onProductUploaded(assetId, file);
    } catch {
      // The upload hook owns the sanitized inline error.
    }
  };
  const openProductFilePicker = () => {
    if (projectId && !uploading) productFileInputRef.current?.click();
  };
  const onProductFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    void uploadProduct(file);
  };
  return (
    <div className="work-grid import-grid">
      <section className="panel main-panel">
        <div className="panel-title"><div><h2>导入商品素材</h2><p>导入候选商品的原始图片与商品信息</p></div></div>
        <div className="field" role="group" aria-labelledby="product-image-upload-label">
          <span className="field-label" id="product-image-upload-label">上传产品地毯图<b>*</b></span>
          <input
            ref={productFileInputRef}
            className="visually-hidden-file-input"
            id="product-image-upload"
            type="file"
            accept={PRODUCT_IMAGE_ACCEPT}
            tabIndex={-1}
            aria-hidden="true"
            disabled={!projectId || uploading}
            onChange={onProductFileChange}
          />
          <button
            className="product-file-input"
            type="button"
            aria-controls="product-image-upload"
            disabled={!projectId || uploading}
            onClick={openProductFilePicker}
          >
            <Upload size={18} />
            <span>{uploading ? "正在上传并校验" : "选择 JPG、PNG 或 WebP 图片"}</span>
          </button>
          {error && <small className="inline-error" role="alert">{error}</small>}
        </div>
        <div className="section-heading">
          <div><strong>已导入的商品图片</strong><span>当前仅支持 1 张产品地毯图，最大 20 MB</span></div>
          <button
            className="text-button product-upload-retry"
            type="button"
            aria-controls="product-image-upload"
            disabled={!projectId || uploading}
            onClick={openProductFilePicker}
          ><Upload size={16} /> {uploading ? "上传中" : "重新上传"}</button>
        </div>
        <div className="source-gallery">
          {[0, 0, 0, 0].map((variant, index) => (
            <button key={index} className={`source-image ${selected === index ? "selected" : ""}`} onClick={() => setSelected(index)}>
              <div className={`source-photo angle-${index}`}>{index === 0 && productPreviewUrl ? <img src={productPreviewUrl} alt="已上传产品地毯" /> : <CarpetArt variant={variant} />}</div>
              <span className="check-dot">{selected === index && <Check size={14} />}</span>
              {index === 0 && <em>主图</em>}
            </button>
          ))}
        </div>
        <div className="product-meta">
          <div><span>商品名称</span><strong>复古花卉地毯 浅灰色 160×230cm</strong></div>
          <div><span>来源店铺</span><strong>北欧地毯家居旗舰店</strong></div>
          <div><span>参考价格</span><strong>¥ 129.00</strong></div>
        </div>
      </section>
      <aside className="panel demand-panel">
        <div className="panel-title"><div><h2>首图需求</h2><p>将运营意图转化为清晰的设计约束</p></div><button className="icon-button"><RotateCcw size={16} /></button></div>
        <Field label="测试方向" required><textarea defaultValue="保留原花纹和颜色，测试奶油风客厅首图" /></Field>
        <Field label="意向风格" required><div className="select-box"><div><Tag>奶油风</Tag><Tag>客厅</Tag></div><ChevronDown size={17} /></div></Field>
        <Field label="目标场景" required><div className="select-box"><span>客厅</span><ChevronDown size={17} /></div></Field>
        <Field label="必须保留" required><div className="tag-input"><Tag>图案</Tag><Tag>颜色</Tag><Tag>长方形比例</Tag></div></Field>
        <Field label="允许修改（可选）"><textarea placeholder="如：边框细节、背景、摆件、视角等" /></Field>
        <Field label="参考风格图">
          <div className="reference-row">
            {[0, 1, 2].map((item) => <RoomScene key={item} variant={item} />)}
            <button className="upload-tile"><Plus size={24} /><span>上传图片</span></button>
          </div>
        </Field>
        <div className="summary-box"><strong>项目摘要</strong><p>奶油风 · 客厅 · 保留图案与颜色 · 轻度二创</p></div>
        <button className="button primary wide" disabled={!productAssetId} onClick={onNext}>{productAssetId ? "确认素材，下一步" : "请先上传真实产品图"} <ArrowRight size={17} /></button>
      </aside>
    </div>
  );
}

function ProcessStep({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState(0);
  const [processed, setProcessed] = useState(false);
  const [split, setSplit] = useState(true);
  return (
    <div className="work-grid process-grid">
      <aside className="panel source-strip">
        <h3>原始商品图</h3><p>共上传 4 张</p>
        {[0, 1, 2, 3].map((item) => (
          <button key={item} className={`mini-source angle-${item} ${item === 0 ? "active" : ""}`}><CarpetArt variant={0} />{item === 0 && <Tag>主图</Tag>}</button>
        ))}
        <button className="button secondary wide"><Upload size={16} /> 重新上传</button>
      </aside>
      <section className="panel compare-panel">
        <div className="panel-title">
          <div><h2>产品处理预览</h2><p>校正透视、提取版图并增强清晰度</p></div>
          <div className="segmented"><button className={!split ? "active" : ""} onClick={() => setSplit(false)}>对比</button><button className={split ? "active" : ""} onClick={() => setSplit(true)}>分屏</button></div>
        </div>
        <div className={`compare-view ${split ? "split" : ""}`}>
          <div className="compare-side before"><span>处理前（原图）</span><div className="angled-carpet"><CarpetArt variant={0} /></div></div>
          <div className="compare-side after"><span>处理后（提取版图）</span><CarpetArt variant={0} /></div>
          <div className="compare-handle">‹ ›</div>
        </div>
        <div className="zoom-bar"><button><ZoomOut size={17} /></button><span>100%</span><button><ZoomIn size={17} /></button><i /><button><Maximize2 size={16} /> 适配窗口</button><i /><button><RotateCcw size={16} /> 重置</button></div>
        <div className="info-callout"><CheckCircle2 size={17} /> 已自动识别产品主体并提取版图，您可根据需要调整处理建议后继续。</div>
        <div className="process-notes">
          <div><span>1</span><strong>梯形校正</strong><p>校正透视角度，确保版图为标准矩形比例。</p></div>
          <div><span>2</span><strong>提取版图</strong><p>去除多余背景，保留完整边框和花纹。</p></div>
          <div><span>3</span><strong>画质优化</strong><p>提升清晰度，优化纹理和色彩表现。</p></div>
        </div>
      </section>
      <aside className="panel settings-panel">
        <h2>处理建议</h2>
        {[
          ["存在透视角度", "建议梯形校正"],
          ["未检测到独立版图", "建议提取版图"],
          ["清晰度一般", "建议高清修复"],
        ].map(([title, desc]) => (
          <label className="suggestion" key={title}><span><strong>{title}</strong><small>{desc}</small></span><input type="checkbox" defaultChecked /></label>
        ))}
        <Field label="二创程度"><div className="choice-row">{["原款还原", "轻度二创", "深度二创"].map((item, index) => <button key={item} className={index === 1 ? "active" : ""}>{item}</button>)}</div></Field>
        <Field label="必须保留"><div className="read-box">图案、颜色、长方形比例</div></Field>
        <Field label="允许修改（可选）"><div className="read-box">边框细节、背景</div></Field>
        <div className="section-heading"><strong>输出候选</strong><span>处理后预览</span></div>
        <div className="candidate-row">
          {[0, 1, 2].map((item) => <button key={item} className={selected === item ? "selected" : ""} onClick={() => setSelected(item)}><CarpetArt variant={0} />{selected === item && <span><Check size={13} /></span>}</button>)}
        </div>
        <div className="dual-actions"><button className="button secondary" onClick={() => setProcessed(true)}>{processed ? "已处理" : "开始处理"}</button><button className="button primary" onClick={onNext}>采用此版图，下一步</button></div>
      </aside>
    </div>
  );
}

function SceneStep({
  onNext,
  projectId,
  productAssetId,
  productPreviewUrl,
}: {
  onNext: () => void;
  projectId: string;
  productAssetId: string;
  productPreviewUrl?: string;
}) {
  const [candidate, setCandidate] = useState(0);
  const [room, setRoom] = useState("客厅");
  const [style, setStyle] = useState("奶油风");
  const [space, setSpace] = useState("中等空间（约15–25㎡）");
  const [light, setLight] = useState("自然光（明亮柔和）");
  const [viewAngle, setViewAngle] = useState("45°斜角视角");
  const [size, setSize] = useState(65);
  const [includePeopleOrPets, setIncludePeopleOrPets] = useState(false);
  const [notes, setNotes] = useState("浅色沙发，保留自然光，不遮挡地毯");
  const [sceneAssetId, setSceneAssetId] = useState<string>();
  const [scenePreviewUrl, setScenePreviewUrl] = useState<string>();
  const [templateId, setTemplateId] = useState<string>();
  const [templatePrompt, setTemplatePrompt] = useState("");
  const [promptState, dispatchPrompt] = useReducer(reducePromptState, initialPromptState(""));
  const [promptError, setPromptError] = useState<string>();
  const [prototypeStatus, setPrototypeStatus] = useState<string>();
  const [prototypeError, setPrototypeError] = useState<string>();
  const [results, setResults] = useState<GenerationResultView[]>([]);
  const generation = useGenerationJob();

  const parameters: SceneParameters = useMemo(() => ({
    room,
    style,
    space,
    light,
    view: viewAngle,
    productShare: size,
    includePeopleOrPets,
    notes,
  }), [room, style, space, light, viewAngle, size, includePeopleOrPets, notes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      renderPrompt(parameters)
        .then((response) => {
          setTemplateId(response.templateId);
          setTemplatePrompt(response.prompt);
          dispatchPrompt({ type: "template", value: response.prompt });
          setPromptError(undefined);
        })
        .catch((reason) => setPromptError(reason instanceof Error ? reason.message : "提示词生成失败"));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [parameters]);

  useEffect(() => {
    listGenerationResults(projectId).then(setResults).catch(() => setResults([]));
  }, [projectId]);

  useEffect(() => {
    if (!generation.resultUrl) return;
    setResults((current) => current.some((item) => item.resultUrl === generation.resultUrl)
      ? current
      : [{ id: `new-${Date.now()}`, jobId: "current", resultUrl: generation.resultUrl!, isSelected: false }, ...current]);
    setCandidate(0);
  }, [generation.resultUrl]);

  const selectScene = useCallback((assetId: string, previewUrl: string) => {
    setSceneAssetId(assetId);
    setScenePreviewUrl(previewUrl);
  }, []);

  const generate = () => {
    if (!sceneAssetId || !promptState.text.trim()) return;
    void generation.submit({
      projectId,
      productAssetId,
      sceneAssetId,
      prompt: promptState.text,
      parameters,
    });
  };

  const prepareChatgptPrototype = async () => {
    if (!sceneAssetId || !promptState.text.trim()) return;
    setPrototypeStatus("正在准备 ChatGPT 原型输入图…");
    setPrototypeError(undefined);
    try {
      const job = await createChatgptPrototypeJob({
        projectId,
        productAssetId,
        sceneAssetId,
        prompt: promptState.text,
        parameters,
      });
      await navigator.clipboard?.writeText(job.prompt).catch(() => undefined);
      setPrototypeStatus(`已准备：${job.inputPath}。提示词已复制，可由本机自动化脚本接管 ChatGPT。`);
    } catch (reason) {
      setPrototypeError(reason instanceof Error ? reason.message : "ChatGPT 原型任务准备失败");
      setPrototypeStatus(undefined);
    }
  };

  const activeResult = results[candidate];
  return (
    <div className="work-grid scene-grid">
      <aside className="panel product-panel">
        <h2>已处理产品</h2>
        <div className="clean-carpet">{productPreviewUrl ? <img src={productPreviewUrl} alt="产品地毯" /> : <CarpetArt variant={0} />}</div>
        <strong>当前产品地毯</strong><span className="muted">生成时锁定图案、颜色、材质和比例</span>
        <div className="tags"><Tag>图案</Tag><Tag>颜色</Tag><Tag>长方形比例</Tag></div>
        <hr />
        <h3>意向参考</h3><p className="muted">三个推荐场景中单选一个，或上传自定义场景</p>
        <SceneReferences projectId={projectId} selectedAssetId={sceneAssetId} onSelect={selectScene} />
      </aside>
      <section className="panel scene-preview-panel">
        <div className="panel-title"><div><h2>场景方案（1:1）</h2><p className="warning">请确认图案、颜色和形状未发生变化</p></div><button className="icon-button"><Maximize2 size={17} /></button></div>
        {activeResult ? <img src={activeResult.resultUrl} alt="生成的地毯场景" className="hero-scene generated-scene" /> : scenePreviewUrl ? <img src={scenePreviewUrl} alt="当前场景参考" className="hero-scene generated-scene scene-reference-preview" /> : <RoomScene variant={0} className="hero-scene" />}
        <div className="generation-status">
          {generation.status === "queued" && "任务已创建，等待生成"}
          {generation.status === "processing" && "正在替换地毯并匹配场景光线…"}
          {generation.status === "succeeded" && "已生成一张新候选图"}
          {generation.error && <span className="inline-error">{generation.error}</span>}
        </div>
        <div className="scene-candidates">
          {results.slice(0, 4).map((item, index) => (
            <button key={item.id} className={candidate === index ? "selected" : ""} onClick={() => setCandidate(index)}>
              <img src={item.resultUrl} alt={`候选方案 ${index + 1}`} /><b>{String.fromCharCode(65 + index)}</b>{candidate === index && <span><Check size={13} /></span>}
            </button>
          ))}
        </div>
        <div className="dual-actions"><button className="button secondary" disabled={generation.isRunning} onClick={generate}><RefreshCw size={17} /> 再生成一张</button><button className="button secondary" disabled={!activeResult}><Save size={17} /> 保留此方案</button></div>
      </section>
      <aside className="panel settings-panel">
        <h2>场景设置</h2>
        <Field label="房间类型"><div className="room-choices">{["客厅", "卧室", "入户"].map((item) => <button key={item} className={room === item ? "active" : ""} onClick={() => setRoom(item)}><LayoutGrid size={20} />{item}</button>)}</div></Field>
        <Field label="场景风格"><select value={style} onChange={(event) => setStyle(event.target.value)}>{sceneStyles.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="空间大小"><select value={space} onChange={(event) => setSpace(event.target.value)}><option>小空间（约8–15㎡）</option><option>中等空间（约15–25㎡）</option><option>大空间（25㎡以上）</option></select></Field>
        <Field label="光线氛围"><select value={light} onChange={(event) => setLight(event.target.value)}><option>自然光（明亮柔和）</option><option>暖光（温馨）</option><option>侧光（有层次）</option></select></Field>
        <Field label="画面视角"><select value={viewAngle} onChange={(event) => setViewAngle(event.target.value)}><option>45°斜角视角</option><option>正面视角</option><option>轻俯视视角</option></select></Field>
        <Field label={`产品占比 ${size}%`}><input className="range" type="range" min="45" max="80" value={size} onChange={(event) => setSize(Number(event.target.value))} /><div className="range-labels"><span>更小（留白多）</span><span>更大（突出产品）</span></div></Field>
        <Field label="是否有人物/宠物"><label className="switch"><input type="checkbox" checked={includePeopleOrPets} onChange={(event) => setIncludePeopleOrPets(event.target.checked)} /><span /></label></Field>
        <Field label="补充要求（可选）"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        <PromptEditor templateId={templateId} text={promptState.text} dirty={promptState.dirty} onEdit={(value) => dispatchPrompt({ type: "edit", value })} onReset={() => dispatchPrompt({ type: "reset", value: templatePrompt })} />
        {promptError && <small className="inline-error">{promptError}</small>}
        {prototypeStatus && <small className="inline-help">{prototypeStatus}</small>}
        {prototypeError && <small className="inline-error">{prototypeError}</small>}
        <button className="button secondary wide" disabled={!sceneAssetId || !promptState.text.trim() || generation.isRunning} onClick={() => { void prepareChatgptPrototype(); }}><WandSparkles size={17} /> ChatGPT 原型测试</button>
        <button className="button primary wide" disabled={!sceneAssetId || !promptState.text.trim() || generation.isRunning} onClick={generate}><WandSparkles size={17} /> {generation.isRunning ? "生成中" : "生成场景"}</button>
        <button className="button primary wide" disabled={!activeResult} onClick={onNext}>采用此方案，下一步 <ArrowRight size={17} /></button>
      </aside>
    </div>
  );
}

function AdjustStep({ onComplete }: { onComplete: () => void }) {
  const [candidate, setCandidate] = useState(0);
  const [scale, setScale] = useState(65);
  const [space, setSpace] = useState(40);
  const [brightness, setBrightness] = useState(10);
  const [completed, setCompleted] = useState(false);
  return (
    <div className="work-grid adjust-grid">
      <aside className="panel candidate-strip">
        <h2>候选方案</h2>
        {[0, 1, 2, 3].map((item) => (
          <button key={item} className={candidate === item ? "selected" : ""} onClick={() => setCandidate(item)}>
            <RoomScene variant={item} /><b>{String.fromCharCode(65 + item)}</b>{candidate === item && <span><Check size={13} /></span>}
          </button>
        ))}
        <hr /><h3>原图对比</h3><div className="original-card"><CarpetArt variant={0} /></div>
      </aside>
      <section className="panel adjust-panel">
        <div className="panel-title">
          <div><h2>首图调整</h2><p>保持产品准确，优化画面比例与留白</p></div>
          <div className="zoom-select"><ZoomIn size={16} /> 100% <ChevronDown size={14} /></div>
        </div>
        <div className="minimal-toolbar">
          <button className="active"><Move size={17} /> 移动产品</button><button><Maximize2 size={17} /> 调整大小</button><button><Crop size={17} /> 裁剪</button><button><WandSparkles size={17} /> 局部修改</button><i /><button><RotateCcw size={17} /></button>
        </div>
        <div className="canvas-wrap" style={{ filter: `brightness(${100 + brightness}%)` }}>
          <RoomScene variant={candidate} className="adjust-scene" />
          <div className="safe-area" style={{ inset: `${Math.max(4, 14 - space / 5)}%` }}>
            <span>1:1 安全区</span>
            <i className="handle nw" /><i className="handle ne" /><i className="handle sw" /><i className="handle se" />
          </div>
        </div>
        <div className="canvas-hint"><CircleHelp size={15} /> 拖拽边框调整裁剪范围，建议保留安全区内的完整地毯<button className="text-button"><RefreshCw size={15} /> 重置视图</button></div>
      </section>
      <aside className="panel settings-panel">
        <h2>首图检查</h2>
        {[
          ["产品占比", scale, setScale, 45, 80],
          ["画面留白", space, setSpace, 15, 65],
          ["亮度", brightness, setBrightness, -10, 25],
        ].map(([label, value, setter, min, max]) => (
          <Field label={`${label} ${value}${label === "产品占比" || label === "画面留白" ? "%" : ""}`} key={label as string}>
            <input className="range" type="range" min={min as number} max={max as number} value={value as number} onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))} />
          </Field>
        ))}
        <div className="quality-list">
          {["图案准确", "颜色准确", "形状比例准确", "透视自然", "场景无遮挡"].map((item) => <div key={item}><CheckCircle2 size={17} />{item}</div>)}
        </div>
        <Field label="修改说明"><textarea defaultValue="优化地毯边缘清晰度，调整光线更柔和。" /></Field>
        <div className="dual-actions"><button className="button secondary">重新生成</button><button className="button secondary">保存为备选</button></div>
        <div className="delivery-box">
          <div><RoomScene variant={candidate} /><span><strong>首图交付（最终版本）</strong><small>final_A_v3.jpg</small><small>1600 × 1600 · JPG</small></span></div>
          <button className="button primary wide" onClick={() => { setCompleted(true); onComplete(); }}><CheckCircle2 size={17} /> {completed ? "首图已保存" : "完成并保存首图"}</button>
        </div>
      </aside>
    </div>
  );
}

function Workbench({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<WorkbenchStep>("import");
  const [projectId, setProjectId] = useState<string>();
  const [productAssetId, setProductAssetId] = useState<string>();
  const [productPreviewUrl, setProductPreviewUrl] = useState<string>();
  const [setupError, setSetupError] = useState<string>();
  const mountedRef = useRef(true);

  const activeStep = !productAssetId && step !== "import" ? "import" : step;
  const setAllowedStep = (nextStep: WorkbenchStep) => {
    if (nextStep !== "import" && !productAssetId) return;
    setStep(nextStep);
  };

  useEffect(() => {
    bootstrapProject()
      .then((project) => setProjectId(project.id))
      .catch((reason) => setSetupError(reason instanceof Error ? reason.message : "项目初始化失败"));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!productPreviewUrl) return;
    return () => URL.revokeObjectURL(productPreviewUrl);
  }, [productPreviewUrl]);

  return (
    <>
      <Topbar title="首图工作台" onNew={() => setStep("import")} onHistory={() => alert("已打开历史版本：V1、V2、V3")} />
      <main className="page workbench-page">
        <Stepper step={activeStep} setStep={setAllowedStep} productAssetId={productAssetId} />
        {setupError && <div className="info-callout error-callout">{setupError}</div>}
        {activeStep === "import" && <ImportStep
          onNext={() => setAllowedStep(getNextStep(activeStep))}
          projectId={projectId}
          productAssetId={productAssetId}
          productPreviewUrl={productPreviewUrl}
          onProductUploaded={(assetId, file) => {
            if (!mountedRef.current) return;
            const previewUrl = URL.createObjectURL(file);
            setProductAssetId(assetId);
            setProductPreviewUrl(previewUrl);
          }}
        />}
        {activeStep === "process" && <ProcessStep onNext={() => setAllowedStep(getNextStep(activeStep))} />}
        {activeStep === "scene" && projectId && productAssetId && <SceneStep
          onNext={() => setAllowedStep(getNextStep(activeStep))}
          projectId={projectId}
          productAssetId={productAssetId}
          productPreviewUrl={productPreviewUrl}
        />}
        {activeStep === "adjust" && <AdjustStep onComplete={onComplete} />}
        <div className="step-footer">
          <button className="text-button" disabled={activeStep === "import"} onClick={() => setAllowedStep(getPreviousStep(activeStep))}><ArrowLeft size={16} /> 上一步</button>
          <span>工作进度会自动保存</span>
        </div>
      </main>
    </>
  );
}

function Projects({ openWorkbench }: { openWorkbench: () => void }) {
  const [filter, setFilter] = useState("全部状态");
  const [search, setSearch] = useState("");
  const filtered = projectCards.filter((item) => item.name.includes(search) && (filter === "全部状态" || item.status === filter));
  return (
    <>
      <Topbar title="选品项目" onNew={openWorkbench} />
      <main className="page standard-page">
        <div className="page-heading"><div><h2>选品项目</h2><p>收集候选商品并快速进入首图制作</p></div><button className="button primary" onClick={openWorkbench}><Plus size={17} /> 新建选品</button></div>
        <div className="filter-bar">
          <div className="search-box"><Search size={17} /><input placeholder="搜索商品名称" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          {["全部状态", "待处理", "设计中", "已完成"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
          <button><SlidersHorizontal size={16} /> 更多筛选</button>
        </div>
        <div className="project-grid">
          {filtered.map((item, index) => (
            <article className="project-card" key={item.name}>
              <div className="project-image"><CarpetArt variant={item.variant} /><span className={`status ${item.status}`}>{item.status}</span></div>
              <div className="project-body">
                <h3>{item.name}</h3><p>来源：淘宝 · 参考价 {item.price}</p>
                <div className="tags"><Tag>{item.style}</Tag><Tag tone="gray">{item.room}</Tag></div>
                <div className="project-note"><strong>测试方向</strong><span>保留产品核心特征，测试更适合目标人群的首图场景。</span></div>
                <div className="project-footer"><span>运营 小周 · 设计 小林</span><button onClick={openWorkbench}>进入制作 <ArrowRight size={14} /></button></div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

function Completed() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <>
      <Topbar title="已完成首图" />
      <main className="page standard-page">
        <div className="page-heading"><div><h2>已完成首图</h2><p>审核完成、可以交付运营的商品第一张图</p></div><div className="search-box"><Search size={17} /><input placeholder="搜索已完成商品" /></div></div>
        <div className="filter-bar"><button className="active">全部</button><button>未下载</button><button>已下载</button><button>待上架</button><button>已上架</button></div>
        <div className="completed-grid">
          {projectCards.concat(projectCards.slice(0, 2)).map((item, index) => (
            <article className="completed-card" key={`${item.name}-${index}`} onClick={() => setSelected(index)}>
              <RoomScene variant={index} />
              <div><span className="status 已完成">已通过</span><h3>{item.name}</h3><p>{item.style} · {item.room}</p><footer><span>2026-06-{18 + index}</span><button>下载</button></footer></div>
            </article>
          ))}
        </div>
        {selected !== null && (
          <div className="drawer-backdrop" onClick={() => setSelected(null)}>
            <aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="panel-title"><div><h2>首图交付</h2><p>最终版本与备选方案</p></div><button className="icon-button" onClick={() => setSelected(null)}>×</button></div>
              <RoomScene variant={selected} className="drawer-image" />
              <h3>{projectCards[selected % projectCards.length].name}</h3>
              <div className="tags"><Tag tone="green">已通过</Tag><Tag>奶油风</Tag><Tag tone="gray">客厅</Tag></div>
              <Field label="设计方向"><div className="read-box">保留原花纹与颜色，优化奶油风客厅构图。</div></Field>
              <Field label="原商品链接"><div className="link-line">detail.tmall.com/item.htm?id=7452… <ExternalLink size={15} /></div></Field>
              <button className="button primary wide"><CloudUpload size={17} /> 下载最终首图</button>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

function Scenes({ useScene }: { useScene: () => void }) {
  const [style, setStyle] = useState("全部");
  const [selected, setSelected] = useState<number | null>(null);
  const scenes = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ index, style: sceneStyles[index % sceneStyles.length], room: ["客厅", "卧室", "入户"][index % 3] })), []);
  return (
    <>
      <Topbar title="风格与场景库" />
      <main className="page standard-page">
        <div className="page-heading"><div><h2>风格与场景库</h2><p>沉淀首图制作可复用的装修风格与场景模板</p></div><button className="button primary"><Upload size={17} /> 上传场景</button></div>
        <div className="library-switch"><button className="active">场景库</button><button>二创风格</button></div>
        <div className="filter-bar style-filter">{["全部", ...sceneStyles].map((item) => <button key={item} className={style === item ? "active" : ""} onClick={() => setStyle(item)}>{item}</button>)}</div>
        <div className="scene-library-grid">
          {scenes.filter((item) => style === "全部" || item.style === style).map((item) => (
            <article className="scene-card" key={item.index} onClick={() => setSelected(item.index)}>
              <RoomScene variant={item.index} />
              <div><h3>{item.style}{item.room} · 自然光</h3><p>{item.room} · 推荐产品占比 60%</p><footer><span>使用 {18 + item.index * 3} 次</span><button onClick={(event) => { event.stopPropagation(); useScene(); }}>用于首图</button></footer></div>
            </article>
          ))}
        </div>
        {selected !== null && (
          <div className="drawer-backdrop" onClick={() => setSelected(null)}>
            <aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="panel-title"><div><h2>场景详情</h2><p>奶油风客厅 · 明亮自然光</p></div><button className="icon-button" onClick={() => setSelected(null)}>×</button></div>
              <RoomScene variant={selected} className="drawer-image" />
              <div className="tags"><Tag>奶油风</Tag><Tag tone="gray">客厅</Tag><Tag tone="warm">自然光</Tag></div>
              <Field label="适合产品"><div className="read-box">浅色、复古花纹、中大尺寸客厅地毯</div></Field>
              <Field label="推荐构图"><div className="read-box">45° 斜角视角 · 产品占比 60%–68%</div></Field>
              <button className="button primary wide" onClick={useScene}><Sparkles size={17} /> 用于首图制作</button>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

export default function App() {
  const [view, setView] = useState<View>("workbench");
  const publicDemo = import.meta.env.VITE_PORTFOLIO_DEMO === "true";
  const [demo, setDemo] = useState(() => publicDemo || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") !== "0"));
  const [toast, setToast] = useState("");
  const setDemoMode = (enabled: boolean) => {
    if (publicDemo && !enabled) { window.top!.location.href = "../../../#case-carpet"; return; }
    const url = new URL(window.location.href);
    if (enabled) url.searchParams.set("demo", "1");
    else url.searchParams.set("demo", "0");
    window.history.replaceState(null, "", url);
    setDemo(enabled);
    setView("workbench");
  };
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };
  return (
    <div className={`app-shell${demo ? " demo-mode" : ""}`}>
      <Sidebar view={view} setView={setView} onDemo={() => setDemoMode(true)} />
      <div className="app-main">
        {demo ? <DemoWorkspace view={view} setView={setView} onExit={() => setDemoMode(false)} /> : <>
        {view === "workbench" && <Workbench onComplete={() => showToast("首图已保存到“已完成首图”")} />}
        {view === "projects" && <Projects openWorkbench={() => setView("workbench")} />}
        {view === "completed" && <Completed />}
        {view === "scenes" && <Scenes useScene={() => setView("workbench")} />}
        </>}
      </div>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}
