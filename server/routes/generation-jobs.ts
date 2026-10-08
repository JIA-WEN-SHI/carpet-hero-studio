import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GenerationInput, GenerationStatus } from "../domain/types";

const uuid = z.string().uuid();
const createSchema = z.object({
  projectId: uuid,
  productAssetId: uuid,
  sceneAssetId: uuid,
  prompt: z.string().trim().min(20).max(12_000),
  parameters: z.record(z.string(), z.unknown()).default({}),
}).refine((value) => value.productAssetId !== value.sceneAssetId, {
  message: "产品图和场景图不能相同",
  path: ["sceneAssetId"],
});

export interface GenerationJobView {
  id: string;
  status: GenerationStatus;
  resultUrl?: string;
  errorMessage?: string;
}

export interface GenerationJobRouteService {
  create(input: GenerationInput): Promise<{ id: string; status: "queued" }>;
  get(id: string): Promise<GenerationJobView | null>;
  history(projectId: string): Promise<Array<{ id: string; jobId: string; resultUrl: string; isSelected: boolean }>>;
  selectResult(resultId: string): Promise<void>;
}

export function registerGenerationJobRoutes(
  app: FastifyInstance,
  service: GenerationJobRouteService,
  schedule: (jobId: string) => void,
) {
  app.post("/api/generation-jobs", async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_GENERATION_JOB", message: "产品图、场景图或提示词无效" });
    }
    const job = await service.create(parsed.data);
    schedule(job.id);
    return reply.status(202).send(job);
  });

  app.get<{ Params: { id: string } }>("/api/generation-jobs/:id", async (request, reply) => {
    const parsed = uuid.safeParse(request.params.id);
    if (!parsed.success) return reply.status(400).send({ error: "INVALID_JOB_ID" });
    const job = await service.get(parsed.data);
    if (!job) return reply.status(404).send({ error: "JOB_NOT_FOUND" });
    return job;
  });

  app.get<{ Params: { id: string } }>("/api/projects/:id/generation-results", async (request, reply) => {
    const parsed = uuid.safeParse(request.params.id);
    if (!parsed.success) return reply.status(400).send({ error: "INVALID_PROJECT_ID" });
    return service.history(parsed.data);
  });

  app.patch<{ Params: { id: string } }>("/api/generation-results/:id/select", async (request, reply) => {
    const parsed = uuid.safeParse(request.params.id);
    if (!parsed.success) return reply.status(400).send({ error: "INVALID_RESULT_ID" });
    await service.selectResult(parsed.data);
    return { success: true };
  });
}
