import type { SupabaseAdmin } from "../lib/supabase";
import type { PromptRouteService } from "../routes/prompts";

export function createPromptTemplateRepository(supabase: SupabaseAdmin): PromptRouteService {
  return {
    async saveVersion(templateId, input) {
      const latest = await supabase.from("prompt_template_versions")
        .select("version_number")
        .eq("template_id", templateId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest.error) throw new Error(latest.error.message);
      const versionNumber = (latest.data?.version_number ?? 0) + 1;
      const created = await supabase.from("prompt_template_versions").insert({
        template_id: templateId,
        version_number: versionNumber,
        content: input.content,
        variable_schema: {},
      }).select("id,version_number").single();
      if (created.error || !created.data) throw new Error(created.error?.message ?? "PROMPT_VERSION_CREATE_FAILED");
      const updated = await supabase.from("prompt_templates")
        .update({ active_version_id: created.data.id, updated_at: new Date().toISOString() })
        .eq("id", templateId);
      if (updated.error) throw new Error(updated.error.message);
      return { id: created.data.id, versionNumber: created.data.version_number };
    },
  };
}
