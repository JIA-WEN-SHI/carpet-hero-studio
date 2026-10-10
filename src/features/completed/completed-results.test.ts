import { describe, expect, it } from "vitest";
import { filterCompletedHeroImages, toCompletedHeroImages } from "./completed-results";

describe("completed hero image mapping", () => {
  const results = [{
    id: "result-1",
    jobId: "dcd6c7b5-4d06-42ee-ada7-3fa9d73c26bc",
    resultUrl: "https://storage.example/result-1.jpg",
    isSelected: false,
  }];

  it("maps persisted generation results to stable completed cards", () => {
    expect(toCompletedHeroImages(results)).toEqual([{
      id: "result-1",
      jobId: "dcd6c7b5-4d06-42ee-ada7-3fa9d73c26bc",
      title: "AI 地毯首图 dcd6c7b5",
      subtitle: "自动生成 · 1:1 首图",
      imageUrl: "https://storage.example/result-1.jpg",
      isSelected: false,
    }]);
  });

  it("filters by title or job id without changing the source list", () => {
    const items = toCompletedHeroImages(results);
    expect(filterCompletedHeroImages(items, "dcd6c7b5")).toEqual(items);
    expect(filterCompletedHeroImages(items, "不存在")).toEqual([]);
    expect(items).toHaveLength(1);
  });
});
