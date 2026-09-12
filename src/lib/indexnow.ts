/** Reject the entire batch if any path is noncanonical. Never accept arbitrary URLs. */
export function changedPagePaths(body: unknown, canonicalPaths: readonly string[]): string[] | null {
  if (!body || typeof body !== "object" || !("paths" in body)) return null;
  const paths = body.paths;
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 100) return null;
  const allowed = new Set(canonicalPaths);
  if (!paths.every((path): path is string => typeof path === "string" && allowed.has(path))) return null;
  return [...new Set(paths)];
}
