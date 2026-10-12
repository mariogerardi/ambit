/** Safe request diagnostics: never include bodies, tokens, query strings or messages. */
export class RequestFailure extends Error {
  constructor(
    message: string,
    readonly context: Record<string, string | number | boolean>,
  ) {
    super(message);
    this.name = "RequestFailure";
  }
}

export function failureType(error: unknown, timedOut = false): string {
  if (timedOut) return "timeout";
  if (error instanceof TypeError) return "network";
  if (error instanceof DOMException && error.name === "AbortError")
    return "abort";
  return error instanceof Error ? error.name : "unknown";
}
