import { buildApp } from "./app";
import { loadConfig } from "./config";
import { loadLocalEnv } from "./load-local-env";
import { createSupabaseAdmin } from "./lib/supabase";
import { createJmrImageProvider } from "./providers/jmr-image";
import { createSupabaseAssetsRepository, createSupabaseAssetStorage } from "./repositories/assets";
import { createSupabaseGenerationJobsRepository } from "./repositories/generation-jobs";
import { createPromptTemplateRepository } from "./repositories/prompt-templates";
import { createAssetService } from "./services/assets";
import { createChatgptPrototypeService } from "./services/chatgpt-prototype";
import { createGenerationJobService } from "./services/generation-jobs";
import { createGenerationRunner } from "./services/generation-runner";

const config = loadConfig(loadLocalEnv());
const supabase = createSupabaseAdmin(config);
const assetsRepository = createSupabaseAssetsRepository(supabase);
const storage = createSupabaseAssetStorage(supabase, config.storageBucket);
const assets = createAssetService({ repository: assetsRepository, storage, bucket: config.storageBucket });
const jobsRepository = createSupabaseGenerationJobsRepository(supabase);
const provider = createJmrImageProvider({
  baseUrl: config.jmrBaseUrl,
  apiKey: config.jmrApiKey,
  proxyUrl: config.jmrProxyUrl,
});
const runner = createGenerationRunner({
  repository: jobsRepository,
  assets,
  provider,
  storage,
  bucket: config.storageBucket,
  costPoints: config.jmrImageCostPoints,
});
const jobs = createGenerationJobService({
  jobs: jobsRepository,
  assets: assetsRepository,
  createSignedUrl: (path) => storage.createSignedUrl(path, 3600),
});
const chatgptPrototype = createChatgptPrototypeService({
  jobs,
  repository: jobsRepository,
  assets,
  storage,
  bucket: config.storageBucket,
});

const app = buildApp({
  assets,
  projects: assets,
  scenes: assets,
  prompts: createPromptTemplateRepository(supabase),
  jobs,
  chatgptPrototype,
  schedule: (jobId) => { void runner.run(jobId); },
});

await runner.recoverQueued();
await app.listen({ host: "127.0.0.1", port: config.apiPort });
