import type { FastifyInstance } from "fastify";

export interface ProjectRouteService {
  bootstrap(): Promise<{ id: string; name: string }>;
}

export function registerProjectRoutes(app: FastifyInstance, service: ProjectRouteService) {
  app.post("/api/projects/bootstrap", async () => service.bootstrap());
}
