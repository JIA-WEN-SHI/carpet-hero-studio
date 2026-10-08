import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerAssetRoutes, type AssetRouteService } from "./assets";
import { registerProjectRoutes, type ProjectRouteService } from "./projects";
import { registerSceneRoutes, type SceneRouteService } from "./scenes";

describe("asset and scene routes", () => {
  it("bootstraps the current single-user project", async () => {
    const app = Fastify();
    const service: ProjectRouteService = {
      bootstrap: vi.fn().mockResolvedValue({ id: "project-1", name: "当前首图项目" }),
    };
    registerProjectRoutes(app, service);

    const response = await app.inject({ method: "POST", url: "/api/projects/bootstrap" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: "project-1", name: "当前首图项目" });
  });

  it("creates a signed upload for a supported product image", async () => {
    const app = Fastify();
    const service: AssetRouteService = {
      createUpload: vi.fn().mockResolvedValue({
        assetId: "asset-1",
        uploadUrl: "https://storage.example/upload",
        token: "upload-token",
        objectPath: "products/project-1/asset-1.png",
      }),
      completeUpload: vi.fn(),
    };
    registerAssetRoutes(app, service);

    const response = await app.inject({
      method: "POST",
      url: "/api/assets/upload-url",
      payload: {
        projectId: "00000000-0000-4000-8000-000000000001",
        kind: "product",
        filename: "rug.png",
        mimeType: "image/png",
        byteSize: 1024,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ assetId: "asset-1", token: "upload-token" });
    expect(service.createUpload).toHaveBeenCalledOnce();
  });

  it("rejects SVG before calling the service", async () => {
    const app = Fastify();
    const service: AssetRouteService = {
      createUpload: vi.fn(),
      completeUpload: vi.fn(),
    };
    registerAssetRoutes(app, service);

    const response = await app.inject({
      method: "POST",
      url: "/api/assets/upload-url",
      payload: {
        projectId: "00000000-0000-4000-8000-000000000001",
        kind: "scene_custom",
        filename: "scene.svg",
        mimeType: "image/svg+xml",
        byteSize: 1024,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.createUpload).not.toHaveBeenCalled();
  });

  it("returns at most three active scene presets", async () => {
    const app = Fastify();
    const service: SceneRouteService = {
      listPresets: vi.fn().mockResolvedValue([
        { id: "1", name: "A", assetId: "a", previewUrl: "https://a", tags: [] },
        { id: "2", name: "B", assetId: "b", previewUrl: "https://b", tags: [] },
        { id: "3", name: "C", assetId: "c", previewUrl: "https://c", tags: [] },
        { id: "4", name: "D", assetId: "d", previewUrl: "https://d", tags: [] },
      ]),
    };
    registerSceneRoutes(app, service);

    const response = await app.inject({ method: "GET", url: "/api/scene-presets?limit=10" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(3);
    expect(service.listPresets).toHaveBeenCalledWith(3);
  });
});
