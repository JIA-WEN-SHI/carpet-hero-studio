import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

const valid = {
  JMR_API_KEY: "test-jmr-key",
  JMR_BASE_URL: "https://jmrai.net/v1",
  JMR_IMAGE_COST_POINTS: "2.8",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  SUPABASE_STORAGE_BUCKET: "carpet-assets",
  API_PORT: "4174",
};

describe("loadConfig", () => {
  it("parses required server-only values", () => {
    expect(loadConfig(valid)).toMatchObject({
      apiPort: 4174,
      storageBucket: "carpet-assets",
      jmrImageCostPoints: 2.8,
    });
  });

  it("removes the trailing slash from the JMR base URL", () => {
    expect(loadConfig({ ...valid, JMR_BASE_URL: "https://jmrai.net/v1/" }).jmrBaseUrl)
      .toBe("https://jmrai.net/v1");
  });

  it("accepts an optional JMR proxy URL", () => {
    expect(loadConfig({ ...valid, JMR_PROXY_URL: "http://127.0.0.1:7897" }).jmrProxyUrl)
      .toBe("http://127.0.0.1:7897");
  });

  it("rejects missing secrets", () => {
    expect(() => loadConfig({ ...valid, JMR_API_KEY: "" })).toThrow("JMR_API_KEY");
  });
});
