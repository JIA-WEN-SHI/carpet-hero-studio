import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompletedGallery } from "./CompletedGallery";

const result = {
  id: "result-1",
  jobId: "dcd6c7b5-4d06-42ee-ada7-3fa9d73c26bc",
  resultUrl: "https://storage.example/generated.jpg",
  isSelected: false,
};

describe("CompletedGallery", () => {
  it("renders the persisted result image with separate accessible card and download controls", () => {
    const markup = renderToStaticMarkup(<CompletedGallery results={[result]} loading={false} onRetry={() => undefined} />);

    expect(markup).toContain('src="https://storage.example/generated.jpg"');
    expect(markup).toContain("AI 地毯首图 dcd6c7b5");
    expect(markup).not.toContain("room-scene");
    expect(markup).toContain('aria-label="查看 AI 地毯首图 dcd6c7b5 详情"');
    expect(markup).toContain('href="https://storage.example/generated.jpg"');
    expect(markup).not.toMatch(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<a\b/);
  });

  it("renders loading and empty states", () => {
    expect(renderToStaticMarkup(<CompletedGallery results={[]} loading onRetry={() => undefined} />))
      .toContain("正在加载已完成首图");
    expect(renderToStaticMarkup(<CompletedGallery results={[]} loading={false} onRetry={() => undefined} />))
      .toContain("暂无已完成首图");
  });

  it("renders an error and retry action", () => {
    const markup = renderToStaticMarkup(<CompletedGallery results={[]} loading={false} error="结果读取失败" onRetry={() => undefined} />);

    expect(markup).toContain("结果读取失败");
    expect(markup).toContain("重新加载");
  });
});
