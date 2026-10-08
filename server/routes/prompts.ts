import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { renderCarpetScenePrompt } from "../prompts/carpet-scene";

export const DEFAULT_CARPET_SCENE_TEMPLATE_ID = "00000000-0000-4000-8000-000000000101";

const parametersSchema = z.object({
  room: z.string().min(1),
  style: z.string().min(1),
  space: z.string().min(1),
  light: z.string().min(1),
  view: z.string().min(1),
  productShare: z.number().min(20).max(90),
  includePeopleOrPets: z.boolean(),
  notes: z.string().max(2_000),
});

export interface PromptRouteService {
  saveVersion(templateId: string, input: { content: string }): Promise<{ id: string; versionNumber: number }>;
}

export function registerPromptRoutes(app: FastifyInstance, service: PromptRouteService) {
  app.post("/api/prompts/render", async (request, reply) => {
    const parsed = parametersSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "INVALID_PROMPT_PARAMETERS" });
    return {
      templateId: DEFAULT_CARPET_SCENE_TEMPLATE_ID,
      prompt: renderCarpetScenePrompt(parsed.data),
    };
  });

  app.post<{ Params: { id: string } }>("/api/prompt-templates/:id/versions", async (request, reply) => {
    const templateId = z.string().uuid().safeParse(request.params.id);
    const body = z.object({ content: z.string().trim().min(20).max(12_000) }).safeParse(request.body);
    if (!templateId.success || !body.success) {
      return reply.status(400).send({ error: "INVALID_PROMPT_TEMPLATE" });
    }
    return reply.status(201).send(await service.saveVersion(templateId.data, body.data));
  });
}
