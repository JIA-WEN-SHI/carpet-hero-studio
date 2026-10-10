import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
  registerChatgptPrototypeRoutes,
  type ChatgptPrototypeRouteService,
} from "./chatgpt-prototype";

const projectId = "00000000-0000-4000-8000-000000000001";
const productAssetId = "00000000-0000-4000-8000-000000000002";
const sceneAssetId = "00000000-0000-4000-8000-000000000003";
const jobId = "00000000-0000-4000-8000-000000000010";

function service(): ChatgptPrototypeRouteService {
  return {
    prepare: vi.fn().mockResolvedValue({
      id: jobId,
      status: "processing",
      inputPath: "D:\\tmp\\chatgpt-prototype\\input.jpg",
      prompt: "请基于这张合成图做画面融合和电商级润色。",
    }),
    complete: vi.fn().mockResolvedValue({
      id: jobId,
      status: "succeeded",
      resultUrl: "https://storage.example/result.png",
    }),
  };
}

describe("chatgpt prototype routes", () => {
  it("prepares a local ChatGPT browser automation job without scheduling JMR", async () => {
    const app = Fastify();
    const prototype = service();
    registerChatgptPrototypeRoutes(app, prototype);

    const response = await app.inject({
      method: "POST",
      url: "/api/chatgpt-prototype-jobs",
      payload: {
        projectId,
        productAssetId,
        sceneAssetId,
        prompt: "第一张产品图替换第二张场景图中的地毯并保留产品细节。",
        parameters: { room: "客厅" },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      id: jobId,
      status: "processing",
      inputPath: "D:\\tmp\\chatgpt-prototype\\input.jpg",
      prompt: "请基于这张合成图做画面融合和电商级润色。",
    });
    expect(prototype.prepare).toHaveBeenCalledOnce();
  });

  it("rejects invalid prototype inputs", async () => {
    const app = Fastify();
    const prototype = service();
    registerChatgptPrototypeRoutes(app, prototype);

    const response = await app.inject({
      method: "POST",
      url: "/api/chatgpt-prototype-jobs",
      payload: {
        projectId,
        productAssetId,
        sceneAssetId: productAssetId,
        prompt: "第一张产品图替换第二张场景图中的地毯并保留产品细节。",
        parameters: {},
      },
    });

    expect(response.statusCode).toBe(400);
    expect(prototype.prepare).not.toHaveBeenCalled();
  });

  it("accepts a local downloaded ChatGPT result path", async () => {
    const app = Fastify();
    const prototype = service();
    registerChatgptPrototypeRoutes(app, prototype);

    const response = await app.inject({
      method: "PATCH",
      url: `/api/chatgpt-prototype-jobs/${jobId}/result`,
      payload: { resultPath: "D:\\tmp\\chatgpt-prototype\\result.png" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: jobId,
      status: "succeeded",
      resultUrl: "https://storage.example/result.png",
    });
    expect(prototype.complete).toHaveBeenCalledWith(jobId, {
      resultPath: "D:\\tmp\\chatgpt-prototype\\result.png",
    });
  });
});
