import type {
  GenerationJobView,
  GenerationResultView,
  SceneParameters,
  ScenePreset,
} from "./types";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await fetchImpl(url, {
    ...init,
    headers: init.body instanceof FormData
      ? init.headers
      : { "content-type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) throw new ApiError(body.message || `请求失败 (${response.status})`, response.status);
  return body;
}

export function bootstrapProject(fetchImpl?: typeof fetch) {
  return requestJson<{ id: string; name: string }>(
    "/api/projects/bootstrap",
    { method: "POST", body: "{}" },
    fetchImpl,
  );
}

export function createUpload(input: {
  projectId: string;
  kind: "product" | "scene_custom";
  filename: string;
  mimeType: string;
  byteSize: number;
}, fetchImpl?: typeof fetch) {
  return requestJson<{ assetId: string; uploadUrl: string; token: string; objectPath: string }>(
    "/api/assets/upload-url",
    { method: "POST", body: JSON.stringify(input) },
    fetchImpl,
  );
}

export async function uploadSignedFile(uploadUrl: string, file: File, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type, "x-upsert": "false" },
    body: file,
  });
  if (!response.ok) throw new ApiError("图片上传失败", response.status);
}

export function completeUpload(assetId: string, fetchImpl?: typeof fetch) {
  return requestJson<{ success: true }>(
    `/api/assets/${assetId}/complete`,
    { method: "POST", body: "{}" },
    fetchImpl,
  );
}

export function listScenePresets(fetchImpl?: typeof fetch) {
  return requestJson<ScenePreset[]>("/api/scene-presets?limit=3", {}, fetchImpl);
}

export function renderPrompt(parameters: SceneParameters, fetchImpl?: typeof fetch) {
  return requestJson<{ templateId: string; prompt: string }>(
    "/api/prompts/render",
    { method: "POST", body: JSON.stringify(parameters) },
    fetchImpl,
  );
}

export function savePromptVersion(templateId: string, content: string, fetchImpl?: typeof fetch) {
  return requestJson<{ id: string; versionNumber: number }>(
    `/api/prompt-templates/${templateId}/versions`,
    { method: "POST", body: JSON.stringify({ content }) },
    fetchImpl,
  );
}

export function createGenerationJob(input: {
  projectId: string;
  productAssetId: string;
  sceneAssetId: string;
  prompt: string;
  parameters: SceneParameters;
}, fetchImpl?: typeof fetch) {
  return requestJson<GenerationJobView>(
    "/api/generation-jobs",
    { method: "POST", body: JSON.stringify(input) },
    fetchImpl,
  );
}

export function getGenerationJob(id: string, fetchImpl?: typeof fetch) {
  return requestJson<GenerationJobView>(`/api/generation-jobs/${id}`, {}, fetchImpl);
}

export function listGenerationResults(projectId: string, fetchImpl?: typeof fetch) {
  return requestJson<GenerationResultView[]>(`/api/projects/${projectId}/generation-results`, {}, fetchImpl);
}

export function selectGenerationResult(resultId: string, fetchImpl?: typeof fetch) {
  return requestJson<{ success: true }>(
    `/api/generation-results/${resultId}/select`,
    { method: "PATCH", body: "{}" },
    fetchImpl,
  );
}
