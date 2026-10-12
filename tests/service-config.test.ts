import { expect, it } from "vitest";
import { apiUrlForEnvironment } from "../src/services/config";
import services from "../deployment/services.json";

it("uses an isolated local API by default and honors an explicit staging URL", () => {
  expect(apiUrlForEnvironment(false)).toBe("http://127.0.0.1:3001");
  expect(apiUrlForEnvironment(true)).toBe(services.apiUrl);
  expect(apiUrlForEnvironment(false, "https://staging.example.com/")).toBe(
    "https://staging.example.com",
  );
});

it("selects the staging API and Cognito pool together without changing production configuration", async () => {
  const { vi } = await import("vitest");
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", "https://staging.example.com");
  vi.stubEnv("VITE_AUTH_AUTHORITY", "https://cognito.example.com/staging");
  vi.stubEnv("VITE_AUTH_CLIENT_ID", "staging-client");
  vi.stubEnv("VITE_AUTH_LOGIN_URL", "https://login.staging.example.com");
  try {
    const { serviceConfig } = await import("../src/services/config");
    expect(serviceConfig.apiUrl).toBe("https://staging.example.com");
    expect(serviceConfig.auth.clientId).toBe("staging-client");
    expect(serviceConfig.auth.authority).toBe(
      "https://cognito.example.com/staging",
    );
    expect(serviceConfig.auth.loginUrl).toBe(
      "https://login.staging.example.com",
    );
    expect(services.auth.clientId).not.toBe("staging-client");
  } finally {
    vi.unstubAllEnvs();
    vi.resetModules();
  }
});

it("loads staging settings for development while excluding them from production builds", async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { loadEnv } = await import("vite");
  const directory = mkdtempSync(join(tmpdir(), "ambit-env-"));
  try {
    writeFileSync(
      join(directory, ".env.development.local"),
      'VITE_API_URL="https://staging.example.com"\nVITE_AUTH_CLIENT_ID="staging-client"\n',
    );
    expect(loadEnv("development", directory, "VITE_")).toMatchObject({
      VITE_API_URL: "https://staging.example.com",
      VITE_AUTH_CLIENT_ID: "staging-client",
    });
    expect(loadEnv("production", directory, "VITE_").VITE_API_URL).not.toBe(
      "https://staging.example.com",
    );
    expect(
      loadEnv("production", directory, "VITE_").VITE_AUTH_CLIENT_ID,
    ).not.toBe("staging-client");
  } finally {
    rmSync(directory, { recursive: true });
  }
});
