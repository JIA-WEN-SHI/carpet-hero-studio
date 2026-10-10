import { describe, expect, it, vi } from "vitest";
import { loadCompletedResults } from "./load-completed-results";

describe("loadCompletedResults", () => {
  it("loads successful results for the current persisted project", async () => {
    const bootstrap = vi.fn().mockResolvedValue({ id: "project-1", name: "当前首图项目" });
    const list = vi.fn().mockResolvedValue([{ id: "result-1", jobId: "job-1", resultUrl: "https://example/result.jpg", isSelected: false }]);

    await expect(loadCompletedResults({ bootstrapProject: bootstrap, listGenerationResults: list }))
      .resolves.toHaveLength(1);
    expect(list).toHaveBeenCalledWith("project-1");
  });

  it("propagates bootstrap and history errors to the page", async () => {
    const error = new Error("结果读取失败");
    await expect(loadCompletedResults({
      bootstrapProject: vi.fn().mockRejectedValue(error),
      listGenerationResults: vi.fn(),
    })).rejects.toBe(error);
  });
});
