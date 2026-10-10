import { bootstrapProject, listGenerationResults } from "../scene-generation/api";

interface CompletedResultDependencies {
  bootstrapProject: typeof bootstrapProject;
  listGenerationResults: typeof listGenerationResults;
}

const defaultDependencies: CompletedResultDependencies = {
  bootstrapProject,
  listGenerationResults,
};

export async function loadCompletedResults(
  dependencies: CompletedResultDependencies = defaultDependencies,
) {
  const project = await dependencies.bootstrapProject();
  return dependencies.listGenerationResults(project.id);
}
