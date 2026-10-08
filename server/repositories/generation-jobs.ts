import type { GenerationInput, GenerationStatus, SupportedImageMimeType } from "../domain/types";
import type { SupabaseAdmin } from "../lib/supabase";
import type { GenerationRunnerRepository, GenerationJobRecord } from "../services/generation-runner";
import type { GenerationJobRepositoryPort } from "../services/generation-jobs";

function mapJob(row: Record<string, unknown>): GenerationJobRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    productAssetId: String(row.product_asset_id),
    sceneAssetId: String(row.scene_asset_id),
    promptSnapshot: String(row.prompt_snapshot),
    status: row.status as GenerationStatus,
  };
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export type GenerationJobsRepository = GenerationRunnerRepository & GenerationJobRepositoryPort;

export function createSupabaseGenerationJobsRepository(supabase: SupabaseAdmin): GenerationJobsRepository {
  return {
    async create(input: GenerationInput) {
      const { data, error } = await supabase.from("generation_jobs").insert({
        project_id: input.projectId,
        product_asset_id: input.productAssetId,
        scene_asset_id: input.sceneAssetId,
        prompt_snapshot: input.prompt,
        structured_parameters: input.parameters,
        provider: "jmr",
        model: "gpt-image-2",
        status: "queued",
      }).select("id,status").single();
      throwIfError(error);
      if (!data) throw new Error("JOB_CREATE_FAILED");
      return { id: data.id, status: "queued" };
    },

    async claim(jobId) {
      const { data, error } = await supabase.from("generation_jobs")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("status", "queued")
        .select("*")
        .maybeSingle();
      throwIfError(error);
      return data ? mapJob(data) : null;
    },

    async succeed(jobId, input) {
      const { error: assetError } = await supabase.from("assets").insert({
        id: input.resultId,
        project_id: null,
        kind: "generation_result",
        bucket: input.bucket,
        object_path: input.objectPath,
        mime_type: input.mimeType as SupportedImageMimeType,
        width: input.width,
        height: input.height,
        byte_size: input.byteSize,
        sha256: input.sha256,
      });
      throwIfError(assetError);
      const { error: resultError } = await supabase.from("generation_results").insert({
        job_id: jobId,
        asset_id: input.resultId,
        candidate_order: 1,
      });
      throwIfError(resultError);
      const { error: jobError } = await supabase.from("generation_jobs").update({
        status: "succeeded",
        provider_request_id: input.providerRequestId,
        duration_ms: input.durationMs,
        cost_points: input.costPoints,
        finished_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      }).eq("id", jobId);
      throwIfError(jobError);
    },

    async fail(jobId, input) {
      const { error } = await supabase.from("generation_jobs").update({
        status: "failed",
        error_code: input.code,
        error_message: input.message,
        duration_ms: input.durationMs,
        finished_at: new Date().toISOString(),
      }).eq("id", jobId);
      throwIfError(error);
    },

    async listQueued() {
      const { data, error } = await supabase.from("generation_jobs").select("id").eq("status", "queued");
      throwIfError(error);
      return (data ?? []).map((row) => row.id);
    },

    async getView(id) {
      const { data, error } = await supabase.from("generation_jobs")
        .select("id,status,error_message")
        .eq("id", id)
        .maybeSingle();
      throwIfError(error);
      if (!data) return null;
      let resultObjectPath: string | undefined;
      if (data.status === "succeeded") {
        const { data: result, error: resultError } = await supabase.from("generation_results")
          .select("asset:assets!generation_results_asset_id_fkey(object_path)")
          .eq("job_id", id)
          .order("candidate_order", { ascending: true })
          .limit(1)
          .maybeSingle();
        throwIfError(resultError);
        const asset = result?.asset;
        const assetRow = Array.isArray(asset) ? asset[0] : asset;
        resultObjectPath = assetRow?.object_path;
      }
      return {
        id: data.id,
        status: data.status as GenerationStatus,
        errorMessage: data.error_message ?? undefined,
        resultObjectPath,
      };
    },

    async history(projectId) {
      const { data, error } = await supabase.from("generation_results")
        .select("id,job_id,is_selected,asset:assets!generation_results_asset_id_fkey(object_path),job:generation_jobs!inner(project_id)")
        .eq("job.project_id", projectId)
        .order("created_at", { ascending: false });
      throwIfError(error);
      return (data ?? []).map((row) => {
        const asset = Array.isArray(row.asset) ? row.asset[0] : row.asset;
        if (!asset) throw new Error("RESULT_ASSET_MISSING");
        return {
          id: row.id,
          jobId: row.job_id,
          objectPath: asset.object_path,
          isSelected: row.is_selected,
        };
      });
    },

    async selectResult(resultId) {
      const clear = await supabase.from("generation_results").update({ is_selected: false }).eq("is_selected", true);
      throwIfError(clear.error);
      const select = await supabase.from("generation_results").update({ is_selected: true }).eq("id", resultId);
      throwIfError(select.error);
    },
  };
}
