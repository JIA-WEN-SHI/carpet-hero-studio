import { describe, expect, it } from "vitest";
import { createJmrImageProvider } from "./jmr-image";

const productBytes = new Uint8Array([1, 2, 3]);
const sceneBytes = new Uint8Array([4, 5, 6]);

describe("JMR image provider", () => {
  it("sends product first and scene second in a two-image edit request", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ data: [{ b64_json: "aGVsbG8=" }] }), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "req-1" },
      });
    };
    const provider = createJmrImageProvider({
      baseUrl: "https://jmrai.net/v1/",
      apiKey: "secret",
      fetchImpl,
    });

    const result = await provider.edit({
      product: { bytes: productBytes, mimeType: "image/png", filename: "product.png" },
      scene: { bytes: sceneBytes, mimeType: "image/png", filename: "scene.png" },
      prompt: "replace the rug",
    });

    expect(capturedUrl).toBe("https://jmrai.net/v1/images/edits");
    expect(new Headers(capturedInit?.headers).get("authorization")).toBe("Bearer secret");
    const form = capturedInit?.body as FormData;
    expect(form.get("model")).toBe("gpt-image-2");
    expect(form.get("prompt")).toBe("replace the rug");
    expect(form.getAll("image")).toHaveLength(2);
    expect((form.getAll("image")[0] as File).name).toBe("product.png");
    expect((form.getAll("image")[1] as File).name).toBe("scene.png");
    expect(new TextDecoder().decode(result.bytes)).toBe("hello");
    expect(result).toMatchObject({ mimeType: "image/png", requestId: "req-1" });
  });

  it("returns a sanitized provider error", async () => {
    const provider = createJmrImageProvider({
      baseUrl: "https://jmrai.net/v1",
      apiKey: "secret",
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: "upstream failed" } }), { status: 502 }),
    });

    await expect(provider.edit({
      product: { bytes: productBytes, mimeType: "image/png", filename: "product.png" },
      scene: { bytes: sceneBytes, mimeType: "image/png", filename: "scene.png" },
      prompt: "replace the rug",
    })).rejects.toMatchObject({ code: "JMR_HTTP_502", status: 502 });
  });
});
