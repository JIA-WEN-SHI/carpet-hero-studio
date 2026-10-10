// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

let root: Root;
let container: HTMLDivElement;

async function mount() {
  root = createRoot(container);
  await act(async () => { root.render(<App />); });
}

async function click(text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) => item.getAttribute("aria-label") === text || item.textContent?.trim() === text);
  if (!button) throw new Error(`找不到按钮：${text}`);
  if (button.disabled) throw new Error(`按钮不可用：${text}`);
  await act(async () => { button.click(); });
}

async function openStep(title: string) {
  await click("首图工作台");
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>(".stepper .step")).find(item => item.querySelector("strong")?.textContent === title);
  if (!button || button.disabled) throw new Error(`步骤不可用：${title}`);
  await act(async () => { button.click(); });
}

async function generateScene() {
  await click("生成场景");
  await act(async () => { vi.advanceTimersByTime(3600); });
}

describe("可交互的演示案例", () => {
  it("仅移除顶部流程横幅和模拟案例切换栏，保留主图入口与四步流程", async () => {
    expect(container.querySelector(".demo-banner")).toBeNull();
    expect(container.querySelector(".demo-case-switcher")).toBeNull();
    expect(container.textContent).not.toContain("一张地毯，从选品到首图");
    expect(container.querySelectorAll(".stepper .step")).toHaveLength(4);
    expect(container.querySelector('[aria-label="上传参考主图"]')).not.toBeNull();
    expect(container.querySelectorAll(".demo-main-options img")).toHaveLength(2);
    await click("确认素材，下一步");
    expect(container.querySelectorAll(".demo-sku-picker button")).toHaveLength(4);
  });
  it("场景库仅客厅全景使用之前调整好的方图，其他五张和工作台批次不变", async () => {
    await click("使用深色主图");
    await click("风格与场景库");
    const expected = ["dark", "light"].flatMap(tone => [1, 2, 3].map(i => `/demo/source-sets/${tone}-reference-${i}.jpg`));
    expected[5] = "/demo/source-sets/light-scene-3.png";
    const images = () => Array.from(container.querySelectorAll(".demo-library-card img"), img => img.getAttribute("src"));
    expect(images()).toEqual(expected);
    expect(container.textContent).not.toContain("待生成");
    expect(container.querySelectorAll(".demo-library-card a")).toHaveLength(6);
    expect(container.querySelectorAll(".demo-library-card a")[5].getAttribute("href")).toBe(expected[5]);
    expect(container.querySelectorAll(".demo-library-card")[5].textContent).toContain("调整后参考图");
    await openStep("场景生成");
    expect(container.querySelectorAll(".demo-angle-options img")).toHaveLength(0);
    await generateScene();
    await click("重新生成场景");
    await act(async () => { vi.advanceTimersByTime(3600); });
    await click("风格与场景库");
    expect(images()).toEqual(expected);
    await openStep("场景生成");
    expect(container.querySelector(".demo-scene-template")?.getAttribute("src")).toBe("/demo/source-sets/dark-scene-4.png");
  });


  it.each(["light", "dark"] as const)("%s风格由主图锁定，重新生成全部换三张，第二批可融合并保存", async tone => {
    await click(tone === "dark" ? "使用深色主图" : "使用浅色主图");
    await openStep("场景生成");
    expect(container.querySelector(".demo-tone-options")).toBeNull();
    expect(container.querySelector(".demo-own-scene")?.textContent).not.toContain(tone === "dark" ? "浅色方案" : "深色方案");
    const images = () => Array.from(container.querySelectorAll(".demo-angle-options img"), img => img.getAttribute("src"));
    await generateScene();
    expect(images()).toEqual([1, 2, 3].map(i => `/demo/source-sets/${tone}-scene-${i}.png`));
    await click("采用场景，进入融合");
    await click("重新生成场景");
    expect(images()).toHaveLength(0);
    expect(container.querySelector(".demo-scene-template")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(3600); });
    expect(images()).toEqual([4, 5, 6].map(i => `/demo/source-sets/${tone}-scene-${i}.png`));
    expect(Array.from(container.querySelectorAll("button")).find(b => b.textContent?.trim() === "模拟融合一张")?.disabled).toBe(true);
    await act(async () => { root.unmount(); });
    await mount();
    expect(images()).toEqual([4, 5, 6].map(i => `/demo/source-sets/${tone}-scene-${i}.png`));
    await act(async () => { container.querySelectorAll<HTMLButtonElement>(".demo-angle-options button")[2].click(); });
    await click("采用场景，进入融合");
    await click("模拟融合一张");
    expect(container.querySelectorAll(".demo-generation-inputs img")[1]?.getAttribute("src")).toBe(`/demo/source-sets/${tone}-scene-6.png`);
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector(".demo-final-preview")?.getAttribute("src")).toBe(`/demo/source-sets/${tone}-fusion-6.png`);
    await click("完成并保存首图");
    expect(container.querySelector(".completed-card img")?.getAttribute("src")).toBe(`/demo/source-sets/${tone}-fusion-6.png`);
    await openStep("场景生成");
    await click("重新生成场景");
    await act(async () => { vi.advanceTimersByTime(3600); });
    expect(images()).toEqual([1, 2, 3].map(i => `/demo/source-sets/${tone}-scene-${i}.png`));
  });
  it("第一步两张指定主图分别带入深浅组，第二步保持选中的自有SKU", async () => {
    expect(Array.from(container.querySelectorAll(".demo-main-options img"), img => img.getAttribute("src"))).toEqual([
      "/demo/source-sets/light-reference-1.jpg", "/demo/source-sets/dark-reference-1.jpg",
    ]);
    await click("使用深色主图");
    expect(container.querySelector(".demo-main-reference img")?.getAttribute("src")).toBe("/demo/source-sets/dark-reference-1.jpg");
    await click("确认素材，下一步");
    expect(container.querySelector(".demo-product-confirm img")?.getAttribute("src")).toBe("/demo/user-33/own-sku-1.png");
    await click("SKU 03 · 米白细条款");
    await click("确认产品，进入场景");
    expect(container.querySelector('.demo-tone-locked strong')?.textContent).toBe("深色方案");
    expect(container.querySelectorAll(".demo-angle-options img")).toHaveLength(0);
    await generateScene();
    expect(Array.from(container.querySelectorAll(".demo-angle-options img"), img => img.getAttribute("src"))).toEqual([
      "/demo/source-sets/dark-scene-1.png", "/demo/source-sets/dark-scene-2.png", "/demo/source-sets/dark-scene-3.png",
    ]);
    await act(async () => { container.querySelector<HTMLButtonElement>(".step")!.click(); });
    await click("使用浅色主图");
    await click("确认素材，下一步");
    expect(container.querySelector(".demo-product-confirm img")?.getAttribute("src")).toBe("/demo/user-33/own-sku-3.png");
    await click("确认产品，进入场景");
    expect(container.querySelector('.demo-tone-locked strong')?.textContent).toBe("浅色方案");
    expect(container.querySelectorAll(".demo-angle-options img")).toHaveLength(0);
  });
  it("点击一次生成后显示三张场景，直接选第三张即可融合，无需再次生成", async () => {
    await openStep("场景生成");
    expect(container.textContent).not.toContain("三种家具搭配");
    expect(container.querySelectorAll(".demo-angle-options img")).toHaveLength(0);
    await click("生成场景");
    await act(async () => { vi.advanceTimersByTime(2400); });
    expect(container.querySelectorAll(".demo-angle-options img")).toHaveLength(0);
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(Array.from(container.querySelectorAll(".demo-angle-options img"), img => img.getAttribute("src"))).toEqual([
      "/demo/source-sets/light-scene-1.png", "/demo/source-sets/light-scene-2.png", "/demo/source-sets/light-scene-3.png",
    ]);
    await click("客厅全景");
    expect(container.querySelectorAll(".demo-angle-options img")).toHaveLength(3);
    expect(container.querySelector(".demo-scene-template")?.getAttribute("src")).toBe("/demo/source-sets/light-scene-3.png");
    await click("采用场景，进入融合");
    await click("模拟融合一张");
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector(".demo-final-preview")?.getAttribute("src")).toBe("/demo/source-sets/light-fusion-3.png");
  });
  it("场景生成状态刷新可恢复，重置会取消未完成的场景生成", async () => {
    await openStep("场景生成");
    await generateScene();
    await act(async () => { root.unmount(); });
    await mount();
    expect(container.querySelector(".demo-scene-template")).not.toBeNull();
    await click("重新生成场景");
    expect(container.querySelector(".demo-scene-template")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1200); });
    await click("重新演示");
    await act(async () => { vi.advanceTimersByTime(5000); });
    await openStep("场景生成");
    expect(container.querySelector(".demo-scene-template")).toBeNull();
    expect(container.querySelector('[aria-label="场景生成演示进度"]')).toBeNull();
  });

  it("直接进入交付也不会绕过场景生成或提前展示场景图", async () => {
    const step = Array.from(container.querySelectorAll<HTMLButtonElement>(".step")).find(b => b.textContent?.includes("首图交付"))!;
    await act(async () => { step.click(); });
    expect(Array.from(container.querySelectorAll("img")).filter(img => /\/demo\/source-sets\/(light|dark)-scene/.test(img.getAttribute("src") ?? ""))).toHaveLength(0);
    await click("先生成场景");
    expect(container.querySelector(".demo-scene-template")).toBeNull();
    await generateScene();
    expect(container.querySelector(".demo-scene-template")).not.toBeNull();
  });
  it("场景未生成不提前显示任何场景结果，过程结束后才出现且可采用", async () => {
    await openStep("场景生成");
    const sceneImages = () => Array.from(container.querySelectorAll("img")).filter(img => /\/demo\/source-sets\/(light|dark)-scene/.test(img.getAttribute("src") ?? ""));
    expect(sceneImages()).toHaveLength(0);
    expect(Array.from(container.querySelectorAll("button")).find(b => b.textContent?.trim() === "采用场景，进入融合")?.disabled).toBe(true);
    await click("生成场景");
    expect(container.querySelector('[aria-label="场景生成演示进度"]')).not.toBeNull();
    expect(sceneImages()).toHaveLength(0);
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(container.textContent).toContain("统一家具与周边陈设");
    expect(sceneImages()).toHaveLength(0);
    await act(async () => { vi.advanceTimersByTime(2400); });
    expect(container.querySelector(".demo-scene-template")?.getAttribute("src")).toBe("/demo/source-sets/light-scene-1.png");
    await click("采用场景，进入融合");
    await act(async () => { container.querySelector<HTMLButtonElement>(".step")!.click(); });
    await click("使用深色主图");
    await openStep("场景生成");
    expect(sceneImages()).toHaveLength(0);
    expect(container.querySelector(".demo-scene-template")).toBeNull();
  });
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("fetch", () => { throw new Error("演示流程不应调用远程接口"); });
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/?demo=1");
    localStorage.clear();
    container = document.createElement("div");
    document.body.append(container);
    await mount();
  });
  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("从预填素材完整走到交付，保存提示词与场景，重新挂载后可查看同一成图", async () => {
    expect(container.querySelector(".topbar")?.textContent).toContain("展示案例");
    const adjustStep = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("检查画面并保存成品"));
    expect(adjustStep?.disabled).toBe(false);
    await click("确认素材，下一步");
    await click("确认产品，进入场景");
    await generateScene();
    await click("采用场景，进入融合");

    const prompt = container.querySelector<HTMLTextAreaElement>('[aria-label="地毯融合提示词"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(prompt, "保留蓝色花纹，增加柔和侧光。");
      prompt.dispatchEvent(new Event("input", { bubbles: true }));
      prompt.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click("模拟融合一张");
    expect(container.querySelector('[aria-label="首图生成演示进度"]')).not.toBeNull();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector(".demo-final-preview")).not.toBeNull();
    await click("完成并保存首图");
    expect(container.querySelector(".completed-card img")?.getAttribute("src")).toBe("/demo/source-sets/light-fusion-1.png");
    expect(container.textContent).toContain("已保存到本浏览器");

    await act(async () => { root.unmount(); });
    await mount();
    await click("已完成首图");
    const detailsButton = container.querySelector<HTMLButtonElement>('[aria-label="查看 自有条纹地毯 · 黑边米白款 详情"]')!;
    await act(async () => { detailsButton.click(); });
    expect(container.querySelector("dialog")?.open).toBe(true);
    expect(container.querySelector<HTMLTextAreaElement>('dialog [aria-label="保存的地毯融合提示词"]')?.value).toBe("保留蓝色花纹，增加柔和侧光。");
    expect(container.querySelector("dialog a")?.getAttribute("href")).toBe("/demo/source-sets/light-fusion-1.png");
    expect(container.querySelector("dialog a")?.getAttribute("download")).toBe("DEMO-33-hero.png");
    await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="关闭详情"]')!.click(); });
  });

  it("重新演示后回到自有 SKU 的第一步，不把场景图预填成已完成首图", async () => {
    await click("确认素材，下一步");
    await click("确认产品，进入场景");
    await generateScene();
    await click("采用场景，进入融合");
    await click("模拟融合一张");
    await act(async () => { vi.advanceTimersByTime(5000); });
    await click("完成并保存首图");
    await click("重新演示");
    expect(container.textContent).toContain("运营选品案例");
    await click("已完成首图");
    expect(container.querySelectorAll(".completed-card")).toHaveLength(0);
  });

  it("直接打开根地址时展示预填案例", async () => {
    await act(async () => { root.unmount(); });
    window.history.replaceState(null, "", "/");
    await mount();
    expect(container.querySelector(".demo-mode")).not.toBeNull();
    expect(container.textContent).toContain("运营选品案例");
  });

  it("未确认没有预填成品，确认保存后才显示当前融合首图并持久保存", async () => {
    await click("已完成首图");
    expect(container.querySelectorAll(".completed-card")).toHaveLength(0);
    expect(container.textContent).not.toContain("深古木");
    await openStep("场景生成");
    await generateScene();
    await click("生成首图并查看");
    await act(async () => { vi.advanceTimersByTime(5000); });
    await click("已完成首图");
    expect(container.querySelectorAll(".completed-card")).toHaveLength(0);
    await openStep("首图交付");
    await click("完成并保存首图");
    expect(container.querySelectorAll(".completed-card")).toHaveLength(1);
    expect(container.querySelector(".completed-card img")?.getAttribute("src")).toBe("/demo/source-sets/light-fusion-1.png");
    await act(async () => { root.unmount(); });
    await mount();
    await click("已完成首图");
    expect(container.querySelectorAll(".completed-card")).toHaveLength(1);
    expect(container.querySelector(".completed-card footer a")?.getAttribute("href")).toBe("/demo/source-sets/light-fusion-1.png");
  });

  it("选品项目仅保留自有SKU项目，载入后保持原素材及四款产品", async () => {
    expect(container.querySelectorAll(".demo-main-options img")).toHaveLength(2);
    await click("选品项目");
    expect(container.querySelectorAll(".demo-project-card")).toHaveLength(1);
    expect(container.textContent).not.toContain("深古木");
    await click("载入此案例");
    expect(container.querySelector(".demo-main-reference img")?.getAttribute("src")).toBe("/demo/source-sets/light-reference-1.jpg");
    await click("确认素材，下一步");
    expect(container.querySelectorAll(".demo-sku-picker button")).toHaveLength(4);
    expect(container.querySelector(".demo-product-confirm img")?.getAttribute("src")).toBe("/demo/user-33/own-sku-1.png");
  });

  it("旧缓存停留在已移除案例时，进入自有SKU工作台且不删除旧记录", async () => {
    await act(async () => { root.unmount(); });
    localStorage.setItem("carpet-hero-user-images-v2-active", "22");
    localStorage.setItem("carpet-hero-user-images-v2-22", '{"legacy":"keep"}');
    await mount();
    expect(container.querySelector('[aria-label="上传参考主图"]')).not.toBeNull();
    expect(localStorage.getItem("carpet-hero-user-images-v2-22")).toBe('{"legacy":"keep"}');
    await click("已完成首图");
    expect(container.querySelectorAll(".completed-card")).toHaveLength(0);
  });

  it("产品确认始终使用所选自有 SKU，其他款式不能展示 SKU01 的融合成品", async () => {
    await click("确认素材，下一步");
    await click("SKU 03 · 米白细条款");
    expect(container.querySelector(".demo-product-confirm img")?.getAttribute("src")).toBe("/demo/user-33/own-sku-3.png");
    await click("确认产品，进入场景");
    await generateScene();
    await click("采用场景，进入融合");
    expect(Array.from(container.querySelectorAll("button")).find(b => b.textContent?.trim() === "切换 SKU 01 并继续融合")?.disabled).toBe(false);
    expect(container.querySelector(".demo-small-product")?.getAttribute("src")).toBe("/demo/user-33/own-sku-3.png");
  });

  it("采用场景后重复点击同一选项仍能融合", async () => {
    await openStep("场景生成");
    await generateScene();
    await click("采用场景，进入融合");
    await click("主图视角");
    await click("模拟融合一张");
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector(".demo-final-preview")?.getAttribute("src")).toBe("/demo/source-sets/light-fusion-1.png");
  });

  it("采用后清空场景提示词会显示原因，恢复模板后能继续融合", async () => {
    await openStep("场景生成");
    await generateScene();
    await click("采用场景，进入融合");
    const prompt = container.querySelector<HTMLTextAreaElement>('[aria-label="场景生成提示词"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(prompt, "");
      prompt.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector("#demo-fusion-help")?.textContent).toContain("场景提示词为空");
    expect(Array.from(container.querySelectorAll("button")).find(b => b.textContent?.trim() === "模拟融合一张")?.disabled).toBe(true);
    await click("恢复场景模板");
    await generateScene();
    await click("采用场景，进入融合");
    await click("模拟融合一张");
    expect(container.querySelector('[aria-label="首图生成演示进度"]')).not.toBeNull();
  });

  it("其他 SKU 采用场景后有可用的明确切换入口，并保留场景完成融合交付", async () => {
    await click("确认素材，下一步");
    await click("SKU 03 · 米白细条款");
    await click("确认产品，进入场景");
    await act(async () => { container.querySelector<HTMLButtonElement>(".step")!.click(); });
    await click("使用深色主图");
    await openStep("场景生成");
    await click("斜向全景");
    await generateScene();
    await click("采用场景，进入融合");
    await click("切换 SKU 01 并继续融合");
    expect(container.textContent).toContain("SKU 01 · 黑边米白款");
    expect(container.textContent).toContain("深色方案 · 斜向全景");
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector(".demo-final-preview")?.getAttribute("src")).toBe("/demo/source-sets/dark-fusion-2.png");
    await click("完成并保存首图");
    expect(container.querySelector(".completed-card")?.textContent).toContain("黑边米白款");
    expect(container.querySelector(".completed-card")?.textContent).not.toContain("米白细条款");
  });

  it("深浅方案各有三个角度，选择深色纵深后融合使用对应的方形图片", async () => {
    await click("确认素材，下一步");
    await click("确认产品，进入场景");
    expect(container.querySelectorAll(".demo-angle-options button")).toHaveLength(3);
    await act(async () => { container.querySelector<HTMLButtonElement>(".step")!.click(); });
    await click("使用深色主图");
    await openStep("场景生成");
    await click("斜向全景");
    expect(container.querySelector(".demo-scene-template")).toBeNull();
    expect(container.querySelectorAll("select")).toHaveLength(0);
    await generateScene();
    await click("采用场景，进入融合");
    await click("模拟融合一张");
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector(".demo-final-preview")?.getAttribute("src")).toBe("/demo/source-sets/dark-fusion-2.png");
  });

  it("最后一步未生成时展示输入与生成入口，分阶段演示后直接显示首图", async () => {
    await openStep("场景生成");
    await generateScene();
    const step = Array.from(container.querySelectorAll<HTMLButtonElement>(".step")).find(b => b.textContent?.includes("首图交付"))!;
    await act(async () => { step.click(); });
    expect(container.textContent).toContain("首图待生成");
    expect(container.querySelector('.demo-generation-inputs img')?.getAttribute('src')).toBe('/demo/user-33/own-sku-1.png');
    expect(container.querySelector(".demo-final-preview")).toBeNull();
    await click("演示生成首图");
    const activeStage = () => container.querySelector('[aria-current="step"].demo-generation-stage')?.textContent;
    expect(activeStage()).toContain("读取产品与场景");
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(activeStage()).toContain("对齐地毯角度与位置");
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(activeStage()).toContain("融合纹理、光线与阴影");
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(activeStage()).toContain("整理无字首图");
    expect(container.querySelector(".demo-final-preview")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(container.querySelector(".demo-final-preview")?.getAttribute("src")).toBe("/demo/source-sets/light-fusion-1.png");
    await click("完成并保存首图");
    expect(container.querySelector(".completed-card img")?.getAttribute("src")).toBe("/demo/source-sets/light-fusion-1.png");
  });

  it("其他 SKU 的最后一步解释无成图原因，并可明确切换到完整示例", async () => {
    await click("确认素材，下一步");
    await click("SKU 03 · 米白细条款");
    await click("确认产品，进入场景");
    await generateScene();
    const step = Array.from(container.querySelectorAll<HTMLButtonElement>(".step")).find(b => b.textContent?.includes("首图交付"))!;
    await act(async () => { step.click(); });
    expect(container.textContent).toContain("此款暂未制作融合成图");
    expect(container.querySelector(".demo-final-preview")).toBeNull();
    await click("切换 SKU 01 体验成图");
    await click("演示生成首图");
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(container.textContent).toContain("自有条纹地毯 · 黑边米白款");
    expect(container.querySelector(".demo-final-preview")?.getAttribute("src")).toBe("/demo/source-sets/light-fusion-1.png");
  });

  it("生成演示期间重新演示会取消计时，不在稍后突然显示旧成图", async () => {
    await openStep("场景生成");
    await generateScene();
    await click("生成首图并查看");
    await act(async () => { vi.advanceTimersByTime(1300); });
    await click("重新演示");
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(container.textContent).toContain("运营选品案例");
    expect(container.querySelector(".demo-final-preview")).toBeNull();
  });

  it("第一步更换参考主图后，第二步仍使用独立的自有 SKU，刷新保留主图选择", async () => {
    await click("使用深色主图");
    expect(container.querySelector(".demo-main-reference img")?.getAttribute("src")).toBe("/demo/source-sets/dark-reference-1.jpg");
    await click("确认素材，下一步");
    expect(container.querySelector(".demo-product-confirm img")?.getAttribute("src")).toBe("/demo/user-33/own-sku-1.png");
    await act(async () => { root.unmount(); });
    await mount();
    await click("上一步");
    expect(container.querySelector(".demo-main-reference img")?.getAttribute("src")).toBe("/demo/source-sets/dark-reference-1.jpg");
  });

  it("主图上传错误会提示并保留原参考图，不会覆盖 SKU", async () => {
    const input = container.querySelector<HTMLInputElement>('[aria-label="上传参考主图"]')!;
    expect(input).not.toBeNull();
    Object.defineProperty(input, "files", { configurable: true, value: [new File(["text"], "notes.txt", { type: "text/plain" })] });
    await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("JPG、PNG 或 WebP");
    expect(container.querySelector(".demo-main-reference img")?.getAttribute("src")).toBe("/demo/source-sets/light-reference-1.jpg");
  });

  it("有效主图读取后预览并持久保存，SKU 保持独立", async () => {
    vi.useRealTimers();
    let decoded!: () => void;
    const loaded = new Promise<void>(resolve => { decoded = resolve; });
    // Happy DOM does not decode image pixels; only the browser image-load boundary is simulated.
    const imageSpy = vi.spyOn(window, "Image").mockImplementation(() => {
      const image = document.createElement("img");
      Object.defineProperty(image, "src", { set() { queueMicrotask(() => { image.dispatchEvent(new Event("load")); decoded(); }); } });
      return image;
    });
    try {
      const input = container.querySelector<HTMLInputElement>('[aria-label="上传参考主图"]')!;
      const pixels = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg=="), c => c.charCodeAt(0));
      Object.defineProperty(input, "files", { configurable: true, value: [new File([pixels], "参考主图.png", { type: "image/png" })] });
      await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); await loaded; });
      const url = container.querySelector(".demo-main-reference img")?.getAttribute("src");
      expect(url).toMatch(/^data:image\/png;base64,/);
      await act(async () => { root.unmount(); });
      await mount();
      expect(container.querySelector(".demo-main-reference img")?.getAttribute("src")).toBe(url);
      await click("确认素材，下一步");
      expect(container.querySelector(".demo-product-confirm img")?.getAttribute("src")).toBe("/demo/user-33/own-sku-1.png");
      await click("确认产品，进入场景");
      expect(container.querySelectorAll(".demo-angle-options button")).toHaveLength(3);
      expect(container.querySelector(".demo-scene-template")).toBeNull();
      expect(container.querySelector(".demo-fusion-preview")).toBeNull();
      await click("客厅全景");
      expect(container.querySelector(".demo-scene-template")).toBeNull();
    } finally { imageSpy.mockRestore(); }
  });

  it("更换第一步主图后仍可自由选择三个角度，并完成原有演示流程", async () => {
    await openStep("场景生成");
    expect(container.querySelector(".demo-scene-template")).toBeNull();
    const firstStep = container.querySelector<HTMLButtonElement>(".step")!;
    await act(async () => { firstStep.click(); });
    await click("使用深色主图");
    await openStep("场景生成");
    expect(container.querySelector(".demo-scene-template")).toBeNull();
    await click("正向纵深");
    expect(container.querySelector(".demo-scene-template")).toBeNull();
    await generateScene();
    await click("生成首图并查看");
    await act(async () => { vi.advanceTimersByTime(5000); });
    await click("完成并保存首图");
    const detailsButton = container.querySelector<HTMLButtonElement>('[aria-label="查看 自有条纹地毯 · 黑边米白款 详情"]')!;
    await act(async () => { detailsButton.click(); });
    expect(container.querySelector('dialog img')?.getAttribute("src")).toBe("/demo/source-sets/dark-fusion-3.png");
  });
});
