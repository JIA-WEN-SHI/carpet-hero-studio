import { describe, expect, it, vi } from "vitest";
import { createSupabaseGenerationJobsRepository } from "./generation-jobs";

describe("Supabase generation jobs repository", () => {
  it("lists history only for succeeded jobs in the requested project", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({
      data: [{
        id: "result-1",
        job_id: "job-1",
        is_selected: false,
        asset: { object_path: "results/result-1.png" },
      }],
      error: null,
    });
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    };
    const repository = createSupabaseGenerationJobsRepository(supabase as never);

    await expect(repository.history("project-1")).resolves.toEqual([{
      id: "result-1",
      jobId: "job-1",
      objectPath: "results/result-1.png",
      isSelected: false,
    }]);

    expect(supabase.from).toHaveBeenCalledWith("generation_results");
    expect(query.eq).toHaveBeenCalledWith("job.project_id", "project-1");
    expect(query.eq).toHaveBeenCalledWith("job.status", "succeeded");
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });
});
