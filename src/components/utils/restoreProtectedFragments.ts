/** Restore nested protected markup, including headings inside artwork links. */
export function restoreProtectedFragments(
  source: string,
  fragments: readonly string[],
  tokenPattern: RegExp,
): string {
  const restored = new Map<number, string>();
  const expanding = new Set<number>();

  const expand = (value: string): string => value.replace(tokenPattern, (token, index: string) => {
    const key = Number(index);
    if (fragments[key] === undefined || expanding.has(key)) return token;
    if (!restored.has(key)) {
      expanding.add(key);
      restored.set(key, expand(fragments[key]));
      expanding.delete(key);
    }
    return restored.get(key)!;
  });

  return expand(source);
}
