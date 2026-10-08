import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerPromptRoutes, type PromptRouteService } from "./prompts";

describe("prompt routes", () => {
  it("renders the default carpet replacement prompt", async () => {
    const app = Fastify();
    const service: PromptRouteService = { saveVersion: vi.fn() };
    registerPromptRoutes(app, service);

    const response = await app.inject({
      method: "POST",
      url: "/api/prompts/render",
      payload: {
        room: "客厅",
        style: "奶油风",
        space: "中等空间",
        light: "自然光",
        view: "45°斜角",
        productShare: 65,
        includePeopleOrPets: false,
        notes: "不遮挡地毯",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().prompt).toContain("第一张图是产品地毯");
    expect(response.json().templateId).toBeTruthy();
  });
});
