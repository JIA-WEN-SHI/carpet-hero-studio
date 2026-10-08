import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAssetRoutes, type AssetRouteService } from "./routes/assets";
import { registerGenerationJobRoutes, type GenerationJobRouteService } from "./routes/generation-jobs";
import { registerProjectRoutes, type ProjectRouteService } from "./routes/projects";
import { registerPromptRoutes, type PromptRouteService } from "./routes/prompts";
import { registerSceneRoutes, type SceneRouteService } from "./routes/scenes";

export interface AppDependencies {
  assets: AssetRouteService;
  projects: ProjectRouteService;
  scenes: SceneRouteService;
  prompts: PromptRouteService;
  jobs: GenerationJobRouteService;
  schedule(jobId: string): void;
}

export function buildApp(dependencies: AppDependencies) {
  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024 });
  void app.register(cors, {
    origin: ["http://127.0.0.1:4173", "http://localhost:4173"],
    methods: ["GET", "POST", "PATCH", "PUT"],
  });

  app.get("/api/health", async () => ({ ok: true }));
  registerProjectRoutes(app, dependencies.projects);
  registerAssetRoutes(app, dependencies.assets);
  registerSceneRoutes(app, dependencies.scenes);
  registerPromptRoutes(app, dependencies.prompts);
  registerGenerationJobRoutes(app, dependencies.jobs, dependencies.schedule);

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ errorType: error instanceof Error ? error.name : "UnknownError" }, "request failed");
    return reply.status(500).send({
      error: "INTERNAL_ERROR",
      message: "请求处理失败，请稍后重试",
    });
  });

  return app;
}
