import { z } from "zod";

const configSchema = z.object({
  JMR_API_KEY: z.string().min(1),
  JMR_BASE_URL: z.string().url().default("https://jmrai.net/v1"),
  JMR_IMAGE_COST_POINTS: z.coerce.number().nonnegative().default(2.8),
  JMR_PROXY_URL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url().optional(),
  ),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("carpet-assets"),
  API_PORT: z.coerce.number().int().positive().default(4174),
  ENABLE_JMR_CONTRACT_TEST: z.enum(["true", "false"]).default("false"),
});

export function loadConfig(env: Record<string, string | undefined>) {
  const value = configSchema.parse(env);

  return {
    jmrApiKey: value.JMR_API_KEY,
    jmrBaseUrl: value.JMR_BASE_URL.replace(/\/$/, ""),
    jmrImageCostPoints: value.JMR_IMAGE_COST_POINTS,
    jmrProxyUrl: value.JMR_PROXY_URL,
    supabaseUrl: value.SUPABASE_URL,
    supabaseSecretKey: value.SUPABASE_SECRET_KEY,
    storageBucket: value.SUPABASE_STORAGE_BUCKET,
    apiPort: value.API_PORT,
    enableJmrContractTest: value.ENABLE_JMR_CONTRACT_TEST === "true",
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
