import snapshot from "./data/language-names.v1.json";

const names: Record<string, string> = snapshot.names;
/** Prepared English labels are independent of the browser's language coverage. */
export function languageName(code: string): string {
  return names[code] ?? "Language name unavailable";
}
