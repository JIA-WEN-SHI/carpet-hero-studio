import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
  registerGenerationJobRoutes,
  type GenerationJobRouteService,
} from "./generation-jobs";

const projectId = "00000000-0000-4000-8000-000000000001";
const productAssetId = "00000000-0000-4000-8000-000000000002";
const sceneAssetId = "00000000-0000-4000-8000-000000000003";
const jobId = "00000000-0000-4000-8000-000000000010";

function service(): GenerationJobRouteService {
  return {
    create: vi.fn().mockResolvedValue({ id: jobId, status: "queued" }),
    get: vi.fn().mockResolvedValue({ id: jobId, status: "queued" }),
    history: vi.fn().mockResolvedValue([]),
    selectResult: vi.fn(),
  };
}

describe("generation job routes", () => {
  it("creates one asynchronous job and schedules it", async () => {
    const app = Fastify();
    const jobs = service();
    const schedule = vi.fn();
    registerGenerationJobRoutes(app, jobs, schedule);

    const response = await app.inject({
      method: "POST",
      url: "/api/generation-jobs",
      payload: {
        projectId,
        productAssetId,
        sceneAssetId,
        prompt: "第一张产品图替换第二张场景图中的地毯并保留产品细节。",
        parameters: { room: "客厅" },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ id: jobId, status: "queued" });
    expect(jobs.create).toHaveBeenCalledOnce();
    expect(schedule).toHaveBeenCalledWith(jobId);
  });

  it("rejects identical product and scene assets", async () => {
    const app = Fastify();
    const jobs = service();
    registerGenerationJobRoutes(app, jobs, vi.fn());

    const response = await app.inject({
      method: "POST",
      url: "/api/generation-jobs",
      payload: {
        projectId,
        productAssetId,
        sceneAssetId: productAssetId,
        prompt: "第一张产品图替换第二张场景图中的地毯并保留产品细节。",
        parameters: {},
      },
    });

    expect(response.statusCode).toBe(400);
    expect(jobs.create).not.toHaveBeenCalled();
  });

  it("polls a job by id", async () => {
    const app = Fastify();
    const jobs = service();
    registerGenerationJobRoutes(app, jobs, vi.fn());

    const response = await app.inject({ method: "GET", url: `/api/generation-jobs/${jobId}` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: jobId, status: "queued" });
  });
});
