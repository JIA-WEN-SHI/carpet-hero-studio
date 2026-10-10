import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GenerationInput, GenerationStatus } from "../domain/types";

const uuid = z.string().uuid();

const prepareSchema = z.object({
  projectId: uuid,
  productAssetId: uuid,
  sceneAssetId: uuid,
  prompt: z.string().trim().min(20).max(12_000),
  parameters: z.record(z.string(), z.unknown()).default({}),
}).refine((value) => value.productAssetId !== value.sceneAssetId, {
  message: "产品图和场景图不能相同",
  path: ["sceneAssetId"],
});

const completeSchema = z.object({
  resultPath: z.string().min(1),
});

export interface ChatgptPrototypePreparedJob {
  id: string;
  status: Extract<GenerationStatus, "processing">;
  inputPath: string;
  prompt: string;
}

export interface ChatgptPrototypeCompletedJob {
  id: string;
  status: Extract<GenerationStatus, "succeeded">;
  resultUrl: string;
}

export interface ChatgptPrototypeRouteService {
  prepare(input: GenerationInput): Promise<ChatgptPrototypePreparedJob>;
  complete(jobId: string, input: { resultPath: string }): Promise<ChatgptPrototypeCompletedJob>;
}

export function registerChatgptPrototypeRoutes(
  app: FastifyInstance,
  service: ChatgptPrototypeRouteService,
) {
  app.post("/api/chatgpt-prototype-jobs", async (request, reply) => {
    const parsed = prepareSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_CHATGPT_PROTOTYPE_JOB",
        message: "产品图、场景图或提示词无效",
      });
    }
    const job = await service.prepare(parsed.data);
    return reply.status(202).send(job);
  });

  app.patch<{ Params: { id: string } }>("/api/chatgpt-prototype-jobs/:id/result", async (request, reply) => {
    const jobId = uuid.safeParse(request.params.id);
    const parsed = completeSchema.safeParse(request.body);
    if (!jobId.success || !parsed.success) {
      return reply.status(400).send({
        error: "INVALID_CHATGPT_PROTOTYPE_RESULT",
        message: "任务 ID 或结果路径无效",
      });
    }
    return service.complete(jobId.data, parsed.data);
  });
}
