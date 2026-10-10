import type { GenerationResultView } from "../scene-generation/types";

export interface CompletedHeroImage {
  id: string;
  jobId: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  isSelected: boolean;
}

export function toCompletedHeroImages(results: GenerationResultView[]): CompletedHeroImage[] {
  return results.map((result) => ({
    id: result.id,
    jobId: result.jobId,
    title: `AI 地毯首图 ${result.jobId.slice(0, 8)}`,
    subtitle: "自动生成 · 1:1 首图",
    imageUrl: result.resultUrl,
    isSelected: result.isSelected,
  }));
}

export function filterCompletedHeroImages(items: CompletedHeroImage[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return items;
  return items.filter((item) =>
    item.title.toLocaleLowerCase().includes(normalized)
    || item.jobId.toLocaleLowerCase().includes(normalized));
}
