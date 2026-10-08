import { fetch as undiciFetch, FormData, ProxyAgent } from "undici";

export interface JmrImagePart {
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
}

export interface JmrEditInput {
  product: JmrImagePart;
  scene: JmrImagePart;
  prompt: string;
}

export interface JmrEditResult {
  bytes: Uint8Array;
  mimeType: string;
  requestId?: string;
}

export class JmrProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "JmrProviderError";
  }
}

interface JmrImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
}

function imageBlob(part: JmrImagePart): Blob {
  return new Blob([part.bytes.slice().buffer], { type: part.mimeType });
}

export function createJmrImageProvider(options: {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  proxyUrl?: string;
  timeoutMs?: number;
}) {
  const dispatcher = options.proxyUrl ? new ProxyAgent(options.proxyUrl) : undefined;
  const undiciTransport = (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
    undiciFetch(input as Parameters<typeof undiciFetch>[0], {
      ...init,
      dispatcher,
    } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  const fetchImpl = options.fetchImpl ?? undiciTransport;
  const endpoint = `${options.baseUrl.replace(/\/$/, "")}/images/edits`;

  return {
    async edit(input: JmrEditInput): Promise<JmrEditResult> {
      const form = new FormData();
      form.append("model", "gpt-image-2");
      form.append("prompt", input.prompt);
      form.append("image", imageBlob(input.product), input.product.filename);
      form.append("image", imageBlob(input.scene), input.scene.filename);

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${options.apiKey}` },
          body: form as unknown as BodyInit,
          signal: AbortSignal.timeout(options.timeoutMs ?? 180_000),
        });
      } catch (error) {
        const code = error instanceof DOMException && error.name === "TimeoutError"
          ? "JMR_TIMEOUT"
          : "JMR_NETWORK_ERROR";
        throw new JmrProviderError(code === "JMR_TIMEOUT" ? "图片生成超时" : "图片服务连接失败", code);
      }

      const requestId = response.headers.get("x-request-id") ?? undefined;
      let payload: JmrImageResponse;
      try {
        payload = await response.json() as JmrImageResponse;
      } catch {
        throw new JmrProviderError("图片服务返回了无效响应", "JMR_INVALID_RESPONSE", response.status);
      }

      if (!response.ok) {
        const message = payload.error?.message?.slice(0, 300) || `图片服务请求失败 (${response.status})`;
        throw new JmrProviderError(message, `JMR_HTTP_${response.status}`, response.status);
      }

      const item = payload.data?.[0];
      if (item?.b64_json) {
        return {
          bytes: new Uint8Array(Buffer.from(item.b64_json, "base64")),
          mimeType: "image/png",
          requestId,
        };
      }

      if (item?.url?.startsWith("https://")) {
        const imageResponse = await fetchImpl(item.url);
        if (!imageResponse.ok) {
          throw new JmrProviderError("生成结果下载失败", "JMR_RESULT_DOWNLOAD_FAILED", imageResponse.status);
        }
        return {
          bytes: new Uint8Array(await imageResponse.arrayBuffer()),
          mimeType: imageResponse.headers.get("content-type")?.split(";")[0] || "image/png",
          requestId,
        };
      }

      throw new JmrProviderError("图片服务未返回图片", "JMR_EMPTY_RESULT", response.status);
    },
  };
}

export type JmrImageProvider = ReturnType<typeof createJmrImageProvider>;
