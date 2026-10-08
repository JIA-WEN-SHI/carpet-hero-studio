import { useCallback, useEffect, useState } from "react";
import { createGenerationJob, getGenerationJob } from "./api";
import type { GenerationJobView } from "./types";

type SubmitInput = Parameters<typeof createGenerationJob>[0];

export function useGenerationJob() {
  const [job, setJob] = useState<GenerationJobView>();
  const [error, setError] = useState<string>();

  const submit = useCallback(async (input: SubmitInput) => {
    if (job?.status === "queued" || job?.status === "processing") return;
    setError(undefined);
    try {
      setJob(await createGenerationJob(input));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建生成任务失败");
    }
  }, [job?.status]);

  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "processing")) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getGenerationJob(job.id);
        if (!cancelled) {
          setJob(next);
          if (next.status === "failed") setError(next.errorMessage || "生成失败，请修改后重试");
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "查询生成状态失败");
      }
    };
    const timer = window.setInterval(() => { void poll(); }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [job]);

  return {
    submit,
    status: job?.status,
    resultUrl: job?.resultUrl,
    error,
    isRunning: job?.status === "queued" || job?.status === "processing",
    reset: () => { setJob(undefined); setError(undefined); },
  };
}
