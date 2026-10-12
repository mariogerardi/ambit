import { appRelease, serviceConfig } from "./config";
import { failureType } from "./requestFailure";
import { reportFailure } from "./monitoring";

export type FeedbackContext = Record<string, string> & { view: string };
export interface FeedbackRequest {
  kind: "question" | "experience";
  context: FeedbackContext;
}
export interface FeedbackItem extends FeedbackRequest {
  id: string;
  category: string;
  message: string;
  status: "new" | "reviewed" | "resolved";
  createdAt: string;
}
export function feedbackContext(context: FeedbackContext): FeedbackContext {
  return {
    ...context,
    release: appRelease,
    device: matchMedia("(pointer: coarse)").matches ? "touch" : "mouse",
  };
}
export async function feedbackApi<T>(
  path: string,
  token?: string,
  body?: unknown,
  method = "POST",
  signal?: AbortSignal,
): Promise<T> {
  const started = performance.now();
  let httpStatus = 0;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await fetch(`${serviceConfig.apiUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    httpStatus = response.status;
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: "Please check your feedback and try again.",
        401: "Your session expired. Please sign in again.",
        403: "You don’t have access to this action.",
        429: "You’ve sent several reports. Please try again in an hour.",
      };
      throw new Error(
        messages[response.status] ??
          "Couldn’t complete the request. Please try again.",
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (signal?.aborted) throw error;
    const context = {
      route: path
        .split(/[?#]/, 1)[0]
        .replace(/\/feedback\/[^/]+$/, "/feedback/{id}"),
      method,
      httpStatus,
      errorType:
        httpStatus >= 400
          ? "http"
          : failureType(error, controller.signal.aborted),
      elapsedMs: Math.round(performance.now() - started),
      online: navigator.onLine,
      attemptCount: 1,
    };
    if (controller.signal.aborted) {
      reportFailure("feedback timeout", context);
      throw new Error("The request took too long. Please try again.");
    }
    reportFailure("feedback request", context);
    if (error instanceof TypeError)
      throw new Error("Couldn’t connect. Check your connection and try again.");
    if (error instanceof SyntaxError)
      throw new Error("Couldn’t complete the request. Please try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
