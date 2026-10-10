export interface Saved<T> {
  value: T;
  available: boolean;
  writable?: boolean;
  recovered?: boolean;
}
export function readSave<T>(
  key: string,
  fallback: T,
  validate: (v: unknown) => v is T,
  recover?: (v: unknown) => T | undefined,
): Saved<T> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
    if (!raw) return { value: fallback, available: true };
  } catch {
    return { value: fallback, available: false, writable: false };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
    if (validate(parsed)) return { value: parsed, available: true };
  } catch {
    /* Preserve malformed JSON before allowing any replacement. */
  }
  const value = recover?.(parsed);
  // Unknown formats stay untouched. A supported damaged save can be replaced
  // only after its exact original has been backed up successfully.
  if (value && validate(value)) {
    try {
      localStorage.setItem(`${key}.recovery.${crypto.randomUUID()}`, raw);
      return { value, available: true, writable: true, recovered: true };
    } catch {
      return { value, available: false, writable: false };
    }
  }
  return { value: fallback, available: true, writable: false };
}
export function writeSave(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");
