import type { ErrorInfo } from "react";
import { addReactError, reactPlugin } from "@datadog/browser-rum-react";
import { datadogRum } from "@datadog/browser-rum";
import { appRelease, serviceConfig } from "./config";

let enabled = false;
let currentView: string | undefined;
export function cleanUrl(value: string) {
  try {
    const url = new URL(value, location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "redacted";
  }
}
export function startMonitoring() {
  if (enabled || import.meta.env.MODE === "test") return;
  if (!import.meta.env.PROD && import.meta.env.VITE_DATADOG_ENABLED !== "true")
    return;
  const applicationId = import.meta.env.VITE_DATADOG_APPLICATION_ID;
  const clientToken = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
  if (!applicationId || !clientToken || location.pathname === "/auth/callback")
    return;
  try {
    datadogRum.init({
      applicationId,
      clientToken,
      site: import.meta.env.VITE_DATADOG_SITE || "datadoghq.com",
      service: "ambit-web",
      env:
        import.meta.env.VITE_DATADOG_ENV ||
        (import.meta.env.PROD ? "production" : "development"),
      version: appRelease,
      plugins: [reactPlugin()],
      sessionSampleRate: 100,
      sessionReplaySampleRate: 0,
      defaultPrivacyLevel: "mask",
      trackViewsManually: true,
      trackResources: true,
      trackLongTasks: true,
      trackUserInteractions: true,
      enablePrivacyForActionName: true,
      allowedTracingUrls: [
        {
          match: serviceConfig.apiUrl,
          propagatorTypes: ["datadog", "tracecontext"],
        },
      ],
      beforeSend(event) {
        if (event.view.url.includes("/auth/callback")) return false;
        event.view.url = cleanUrl(event.view.url);
        if (event.view.referrer)
          event.view.referrer = cleanUrl(event.view.referrer);
        if (event.type === "resource") {
          if (
            event.resource.url.startsWith(serviceConfig.auth.loginUrl) ||
            event.resource.url.startsWith(serviceConfig.auth.authority)
          )
            return false;
          event.resource.url = cleanUrl(event.resource.url);
        }
        if (event.type === "error" && event.error.resource) {
          const url = event.error.resource.url;
          if (
            url.startsWith(serviceConfig.auth.loginUrl) ||
            url.startsWith(serviceConfig.auth.authority)
          )
            return false;
          event.error.resource.url = cleanUrl(url);
        }
        return true;
      },
    });
    enabled = true;
  } catch {
    // Monitoring must never prevent guest play or account access.
  }
}
export function trackView(name: string) {
  startMonitoring();
  if (enabled && currentView !== name) {
    datadogRum.startView({ name });
    currentView = name;
  }
}
export function reportFailure(
  area: string,
  context: Record<string, string | number | boolean> = {},
  error?: Error,
) {
  if (enabled)
    datadogRum.addError(error ?? new Error(`Ambit ${area} failed`), {
      area,
      ...context,
    });
}
export function trackAction(
  name: string,
  context: Record<string, string> = {},
) {
  if (enabled) datadogRum.addAction(name, context);
}

export function reportReactFailure(error: unknown, info: ErrorInfo) {
  if (enabled) addReactError(error, info);
}
