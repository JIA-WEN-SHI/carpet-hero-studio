import type { FastifyInstance } from "fastify";
import { z } from "zod";

export interface ScenePresetView {
  id: string;
  name: string;
  assetId: string;
  previewUrl: string;
  tags: string[];
}

export interface SceneRouteService {
  listPresets(limit: number): Promise<ScenePresetView[]>;
}

export function registerSceneRoutes(app: FastifyInstance, service: SceneRouteService) {
  app.get("/api/scene-presets", async (request) => {
    const parsed = z.object({ limit: z.coerce.number().int().positive().optional() }).safeParse(request.query);
    const limit = Math.min(parsed.success ? (parsed.data.limit ?? 3) : 3, 3);
    const presets = await service.listPresets(limit);
    return presets.slice(0, 3);
  });
}
