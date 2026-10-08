export type GenerationStatus = "queued" | "processing" | "succeeded" | "failed";

export interface ScenePreset {
  id: string;
  name: string;
  assetId: string;
  previewUrl: string;
  tags: string[];
}

export interface SceneParameters {
  room: string;
  style: string;
  space: string;
  light: string;
  view: string;
  productShare: number;
  includePeopleOrPets: boolean;
  notes: string;
}

export interface GenerationJobView {
  id: string;
  status: GenerationStatus;
  resultUrl?: string;
  errorMessage?: string;
}

export interface GenerationResultView {
  id: string;
  jobId: string;
  resultUrl: string;
  isSelected: boolean;
}
