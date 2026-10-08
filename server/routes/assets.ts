import type { FastifyInstance } from "fastify";
import { z } from "zod";

const uploadSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(["product", "scene_custom"]),
  filename: z.string().min(1).max(200),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  byteSize: z.number().int().positive().max(20 * 1024 * 1024),
});

export interface AssetRouteService {
  createUpload(input: z.infer<typeof uploadSchema>): Promise<{
    assetId: string;
    uploadUrl: string;
    token: string;
    objectPath: string;
  }>;
  completeUpload(assetId: string): Promise<void>;
}

export function registerAssetRoutes(app: FastifyInstance, service: AssetRouteService) {
  app.post("/api/assets/upload-url", async (request, reply) => {
    const parsed = uploadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_ASSET", message: "图片格式或大小不符合要求" });
    }
    return service.createUpload(parsed.data);
  });

  app.post<{ Params: { id: string } }>("/api/assets/:id/complete", async (request, reply) => {
    const assetId = z.string().uuid().safeParse(request.params.id);
    if (!assetId.success) {
      return reply.status(400).send({ error: "INVALID_ASSET_ID", message: "素材编号无效" });
    }
    await service.completeUpload(assetId.data);
    return { success: true };
  });
}
