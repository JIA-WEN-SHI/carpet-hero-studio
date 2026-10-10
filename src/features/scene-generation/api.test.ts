import { describe, expect, it, vi } from "vitest";
import { createChatgptPrototypeJob, createGenerationJob, getGenerationJob } from "./api";

describe("scene generation API", () => {
  it("posts both asset roles and the edited prompt", async () => {
    const fetchImpl: typeof fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "job-1",
      status: "queued",
    }), { status: 202, headers: { "content-type": "application/json" } }));

    await createGenerationJob({
      projectId: "project-1",
      productAssetId: "product-1",
      sceneAssetId: "scene-1",
      prompt: "用户修改后的完整提示词",
      parameters: {
        room: "客厅",
        style: "奶油风",
        space: "中等空间",
        light: "自然光",
        view: "45°斜角",
        productShare: 65,
        includePeopleOrPets: false,
        notes: "不遮挡地毯",
      },
    }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/api/generation-jobs", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        projectId: "project-1",
        productAssetId: "product-1",
        sceneAssetId: "scene-1",
        prompt: "用户修改后的完整提示词",
        parameters: {
          room: "客厅",
          style: "奶油风",
          space: "中等空间",
          light: "自然光",
          view: "45°斜角",
          productShare: 65,
          includePeopleOrPets: false,
          notes: "不遮挡地毯",
        },
      }),
    }));
  });

  it("maps non-success responses to a safe API error", async () => {
    const fetchImpl: typeof fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: "任务不存在",
    }), { status: 404, headers: { "content-type": "application/json" } }));

    await expect(getGenerationJob("job-1", fetchImpl)).rejects.toMatchObject({
      status: 404,
      message: "任务不存在",
    });
  });

  it("creates a ChatGPT browser prototype job without calling the JMR queue", async () => {
    const fetchImpl: typeof fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "job-1",
      status: "processing",
      inputPath: "D:\\tmp\\chatgpt-prototype\\job-1\\chatgpt-input.jpg",
      prompt: "请基于这张合成图做画面融合和电商级润色。",
    }), { status: 202, headers: { "content-type": "application/json" } }));

    await createChatgptPrototypeJob({
      projectId: "project-1",
      productAssetId: "product-1",
      sceneAssetId: "scene-1",
      prompt: "用户修改后的完整提示词",
      parameters: {
        room: "客厅",
        style: "奶油风",
        space: "中等空间",
        light: "自然光",
        view: "45°斜角",
        productShare: 65,
        includePeopleOrPets: false,
        notes: "不遮挡地毯",
      },
    }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/api/chatgpt-prototype-jobs", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("\"productAssetId\":\"product-1\""),
    }));
  });
});
