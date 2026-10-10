import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";
import { ImportStep } from "./App";

function renderImportStep(options: {
  projectId?: string;
  productAssetId?: string;
  productPreviewUrl?: string;
} = {}) {
  const projectId = "projectId" in options ? options.projectId : "project-1";
  return renderToStaticMarkup(
    <ImportStep
      onNext={() => undefined}
      projectId={projectId}
      productAssetId={options.productAssetId}
      productPreviewUrl={options.productPreviewUrl}
      onProductUploaded={() => undefined}
    />,
  );
}

function textContent(markup: string) {
  return markup.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

function buttons(markup: string) {
  return [...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map((match) => ({
    attributes: match[1],
    text: textContent(match[2]),
  }));
}

describe("ImportStep", () => {
  it("renders local product upload as the only import UI", () => {
    const markup = renderImportStep();

    expect(markup).not.toContain("从选品项目导入");
    expect(markup).not.toContain("粘贴淘宝链接");

    const productInputs = [...markup.matchAll(/<input\b[^>]*\bid="product-image-upload"[^>]*>/g)];
    expect(productInputs).toHaveLength(1);
    expect(productInputs[0][0]).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(productInputs[0][0]).toContain('tabindex="-1"');
    expect(productInputs[0][0]).toContain('aria-hidden="true"');

    const uploadTriggers = buttons(markup).filter(({ attributes }) =>
      attributes.includes('aria-controls="product-image-upload"'),
    );
    expect(uploadTriggers).toHaveLength(2);
    expect(uploadTriggers.map(({ text }) => text)).toEqual(expect.arrayContaining([
      expect.stringContaining("选择 JPG、PNG 或 WebP 图片"),
      expect.stringContaining("重新上传"),
    ]));
    expect(markup).toContain("当前仅支持 1 张产品地毯图，最大 20 MB");
  });

  it("groups upload controls without wrapping labelable controls in a label", () => {
    const markup = renderImportStep();
    const labels = [...markup.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)];
    const uploadControlLabel = labels.find((match) =>
      match[0].includes('id="product-image-upload"') && match[0].includes("<button"),
    );

    expect(uploadControlLabel).toBeUndefined();
    expect(markup).toMatch(
      /<div\b[^>]*\brole="group"[^>]*\baria-labelledby="product-image-upload-label"[^>]*>/,
    );
    expect(markup).toContain('id="product-image-upload-label"');
  });

  it("renders the uploaded product preview", () => {
    const markup = renderImportStep({ productPreviewUrl: "blob:product-preview" });

    expect(markup).toContain('<img src="blob:product-preview" alt="已上传产品地毯"/>');
  });

  it("disables the input and both upload triggers without a project", () => {
    const markup = renderImportStep({ projectId: undefined });
    const productInput = markup.match(/<input\b[^>]*\bid="product-image-upload"[^>]*>/)?.[0];
    const uploadTriggers = buttons(markup).filter(({ attributes }) =>
      attributes.includes('aria-controls="product-image-upload"'),
    );

    expect(productInput).toMatch(/\bdisabled(?:="")?/);
    expect(uploadTriggers).toHaveLength(2);
    expect(uploadTriggers.every(({ attributes }) => /\bdisabled(?:="")?/.test(attributes))).toBe(true);
  });

  it("blocks the next step until a real product image is uploaded", () => {
    const nextButton = buttons(renderImportStep()).find(({ text }) =>
      text.includes("请先上传真实产品图"),
    );

    expect(nextButton).toBeDefined();
    expect(nextButton?.attributes).toMatch(/\bdisabled(?:="")?/);
  });

  it("enables the next step after a product asset is available", () => {
    const nextButton = buttons(renderImportStep({ productAssetId: "asset-1" })).find(({ text }) =>
      text.includes("确认素材，下一步"),
    );

    expect(nextButton).toBeDefined();
    expect(nextButton?.attributes).not.toMatch(/\bdisabled(?:="")?/);
  });

  it("keeps later workbench steps disabled before product validation", () => {
    const stepperButtons = buttons(renderToStaticMarkup(<App />));
    const processStep = stepperButtons.find(({ text }) => text.includes("产品处理"));
    const sceneStep = stepperButtons.find(({ text }) => text.includes("场景生成"));

    expect(processStep).toBeDefined();
    expect(processStep?.attributes).toMatch(/\bdisabled(?:="")?/);
    expect(sceneStep).toBeDefined();
    expect(sceneStep?.attributes).toMatch(/\bdisabled(?:="")?/);
  });
});
