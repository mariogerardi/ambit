// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { datadogRum } from "@datadog/browser-rum";
const rum = vi.hoisted(() => ({
  init: vi.fn(),
  startView: vi.fn(),
  addError: vi.fn(),
  addAction: vi.fn(),
}));
vi.mock("@datadog/browser-rum", () => ({ datadogRum: rum }));
vi.mock("@datadog/browser-rum-react", () => ({
  reactPlugin: () => "react-plugin",
  addReactError: vi.fn(),
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("MODE", "production");
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_DATADOG_APPLICATION_ID", "public-app-id");
  vi.stubEnv("VITE_DATADOG_CLIENT_TOKEN", "public-token");
  vi.stubEnv("VITE_DATADOG_SITE", "datadoghq.com");
  history.replaceState(null, "", "/study");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("initializes React RUM with masked click names and sampled session replay", async () => {
  const { trackView } = await import("../src/services/monitoring");
  trackView("study");
  trackView("study");
  trackView("explore");
  expect(rum.init).toHaveBeenCalledOnce();
  expect(rum.init.mock.calls[0][0]).toMatchObject({
    plugins: ["react-plugin"],
    sessionSampleRate: 100,
    sessionReplaySampleRate: 10,
    defaultPrivacyLevel: "mask",
    trackViewsManually: true,
    trackUserInteractions: true,
    enablePrivacyForActionName: true,
  });
  expect(rum.startView.mock.calls).toEqual([
    [{ name: "study" }],
    [{ name: "explore" }],
  ]);
});
it("skips automated browsers and crawlers but allows ordinary users", async () => {
  for (const navigatorValue of [
    { webdriver: true, userAgent: "Mozilla/5.0" },
    { webdriver: false, userAgent: "Googlebot/2.1" },
    { webdriver: false, userAgent: "facebookexternalhit/1.1" },
    { webdriver: false, userAgent: "Lighthouse" },
  ]) {
    vi.resetModules();
    vi.stubGlobal("navigator", navigatorValue);
    const { startMonitoring } = await import("../src/services/monitoring");
    startMonitoring();
    expect(rum.init).not.toHaveBeenCalled();
  }
  vi.resetModules();
  vi.stubGlobal("navigator", { webdriver: false, userAgent: "Mozilla/5.0" });
  const { startMonitoring } = await import("../src/services/monitoring");
  startMonitoring();
  expect(rum.init).toHaveBeenCalledOnce();
});
it("reports a supplied safe error with its original stack and context", async () => {
  const { startMonitoring, reportFailure } = await import(
    "../src/services/monitoring"
  );
  startMonitoring();
  const cause = new Error("Feedback response was invalid");
  reportFailure("feedback request", { httpStatus: 200 }, cause);
  expect(rum.addError).toHaveBeenCalledWith(cause, {
    area: "feedback request",
    httpStatus: 200,
  });
});
it("excludes auth callbacks and waits until their parameters are removed", async () => {
  history.replaceState(null, "", "/auth/callback?code=private");
  const { trackView } = await import("../src/services/monitoring");
  trackView("account");
  expect(rum.init).not.toHaveBeenCalled();
  history.replaceState(null, "", "/account");
  trackView("account");
  expect(rum.init).toHaveBeenCalledOnce();
});
it("does not enable telemetry in development without opting in", async () => {
  vi.stubEnv("PROD", false);
  vi.stubEnv("MODE", "development");
  vi.stubEnv("VITE_DATADOG_ENABLED", "false");
  const { trackView } = await import("../src/services/monitoring");
  trackView("home");
  expect(rum.init).not.toHaveBeenCalled();
});
it("strips URL secrets and drops Cognito traffic before sending events", async () => {
  const { startMonitoring } = await import("../src/services/monitoring");
  const { serviceConfig } = await import("../src/services/config");
  startMonitoring();
  type RumEvent = Parameters<
    NonNullable<Parameters<typeof datadogRum.init>[0]["beforeSend"]>
  >[0];
  const beforeSend = rum.init.mock.calls[0][0].beforeSend;
  const event = {
    type: "resource",
    view: {
      url: "https://playambit.com/study?token=secret#private",
      referrer: "https://playambit.com/?code=private",
    },
    resource: { url: `${serviceConfig.apiUrl}/admin/feedback?cursor=private` },
  } as RumEvent;
  expect(beforeSend(event)).toBe(true);
  expect(JSON.stringify(event)).not.toContain("private");
  expect(JSON.stringify(event)).not.toContain("secret");
  const authEvent = {
    type: "resource",
    view: { url: "https://playambit.com/account" },
    resource: { url: `${serviceConfig.auth.loginUrl}/oauth2/token` },
  } as RumEvent;
  expect(beforeSend(authEvent)).toBe(false);
});
it("keeps play working if SDK initialization fails", async () => {
  rum.init.mockImplementationOnce(() => {
    throw new Error("SDK unavailable");
  });
  const { trackView } = await import("../src/services/monitoring");
  expect(() => trackView("home")).not.toThrow();
  expect(rum.startView).not.toHaveBeenCalled();
});

it("labels staging telemetry separately from production", async () => {
  vi.stubEnv("VITE_DATADOG_ENV", "staging");
  const { startMonitoring } = await import("../src/services/monitoring");
  startMonitoring();
  expect(rum.init.mock.calls[0][0].env).toBe("staging");
});
