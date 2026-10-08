import { renderToStaticMarkup } from "react-dom/server";
import { CarpetArt, RoomScene } from "./art";
import type { SceneParameters } from "./features/scene-generation/types";
import './demo-layout.css';

export const demoMode = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_PORTFOLIO_DEMO === "true";
if (demoMode && typeof document !== 'undefined') document.documentElement.classList.add('public-demo');
const svgDocument = (markup: string) => markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
const asImage = (markup: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDocument(markup))}`;
export const demoProduct = asImage(renderToStaticMarkup(<CarpetArt variant={0} />));
const scenes = ["奶油风客厅", "现代卧室", "温暖入户"].map((name, i) => ({
  id: `demo-scene-${i}`, assetId: `demo-scene-${i}`, name,
  previewUrl: asImage(renderToStaticMarkup(<RoomScene variant={i} />)), tags: ["示例素材"],
}));
const jobs = new Map<string, { scene: number; polls: number }>();
const results: { id: string; jobId: string; resultUrl: string; isSelected: boolean }[] = [];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
let version = 0;

// This adapter is selected only by the explicit public demo build. No API or model is called.
export const demoRequest: typeof fetch = async (input, init = {}) => {
  const path = String(input);
  const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
  if (path === "/api/projects/bootstrap") return json({ id: "demo-carpet", name: "复古花卉地毯 · 示例" });
  if (path.startsWith("/api/scene-presets")) return json(scenes);
  if (path === "/api/assets/upload-url") {
    const id = crypto.randomUUID();
    return json({ assetId: id, uploadUrl: `demo-upload:${id}`, token: "demo", objectPath: "browser-only" });
  }
  if (path.startsWith("demo-upload:") || /^\/api\/assets\/.*\/complete$/.test(path)) return json({ success: true });
  if (path === "/api/prompts/render") {
    const p = body as SceneParameters;
    return json({ templateId: "demo-template", prompt: `将地毯放入${p.style}${p.room}，${p.space}，${p.light}，${p.view}。产品占比 ${p.productShare}%。保留图案、颜色、材质和比例。${p.includePeopleOrPets ? "可出现人物或宠物。" : "不出现人物或宠物。"}${p.notes}` });
  }
  if (path.includes("/versions")) return json({ id: `demo-version-${++version}`, versionNumber: version });
  if (path === "/api/generation-jobs") {
    const id = crypto.randomUUID();
    const scene = Math.max(0, scenes.findIndex(s => s.assetId === body.sceneAssetId));
    jobs.set(id, { scene, polls: 0 });
    return json({ id, status: "queued" }, 202);
  }
  if (path.startsWith("/api/generation-jobs/")) {
    const id = path.split("/").pop()!;
    const job = jobs.get(id);
    if (!job) return json({ message: "演示任务不存在" }, 404);
    job.polls++;
    if (job.polls === 1) return json({ id, status: "processing" });
    const resultUrl = scenes[job.scene].previewUrl;
    if (!results.some(r => r.jobId === id)) results.unshift({ id: `result-${id}`, jobId: id, resultUrl, isSelected: false });
    return json({ id, status: "succeeded", resultUrl });
  }
  if (path.endsWith("/generation-results")) return json(results);
  if (path.endsWith("/select")) return json({ success: true });
  return json({ message: "此入口未包含在公开演示中" }, 400);
};

export function downloadDemoScene(index = 0) {
  const markup = svgDocument(renderToStaticMarkup(<RoomScene variant={index} />));
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  const a = document.createElement("a"); a.href = url; a.download = "地毯场景-示例.svg"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
