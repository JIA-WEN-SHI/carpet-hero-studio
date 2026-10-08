import { JmrProviderError } from "../providers/jmr-image";

export interface SafeError {
  code: string;
  message: string;
}

function redact(message: string): string {
  return message
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]")
    .slice(0, 300);
}

export function sanitizeError(error: unknown): SafeError {
  if (error instanceof JmrProviderError) {
    return { code: error.code, message: redact(error.message) };
  }
  return { code: "GENERATION_FAILED", message: "生成失败，请检查素材或提示词后重试" };
}
