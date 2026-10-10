// Resolve the same offline image set at the Vite root and under a portfolio subdirectory.
export function demoAssetUrl(value: string): string {
  return value.startsWith("/demo/")
    ? `${import.meta.env.BASE_URL}${value.slice(1)}`
    : value;
}
