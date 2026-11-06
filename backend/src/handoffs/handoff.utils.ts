/** Pure merge helpers, split out of HandoffService so they're testable without a database. */

export function mergeDetails(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...existing, ...patch };
}

export function mergeMessageIds(existing: string[], toAppend: string[]): string[] {
  return [...new Set([...existing, ...toAppend])];
}
