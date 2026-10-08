import dotenv from "dotenv";
import { resolve } from "node:path";

export function loadLocalEnv(
  cwd = process.cwd(),
  environment: Record<string, string | undefined> = process.env,
) {
  const result = dotenv.config({
    path: resolve(cwd, ".env.local"),
    processEnv: environment,
    quiet: true,
  });
  if (result.error) throw result.error;
  return environment;
}
