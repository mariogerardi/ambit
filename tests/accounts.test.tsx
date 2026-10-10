// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User, UserManagerSettings } from "oidc-client-ts";
import {
  AccountProvider,
  isAdmin,
  safeReturnPath,
  useAccount,
} from "../src/services/accounts";
import type { AccountAccess } from "../src/services/accounts";

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  callback: vi.fn(),
  signin: vi.fn(),
  renew: vi.fn(),
  remove: vi.fn(),
  settings: [] as UserManagerSettings[],
}));
vi.mock("oidc-client-ts", () => ({
  WebStorageStateStore: class {},
  UserManager: class {
    constructor(settings: UserManagerSettings) {
      auth.settings.push(settings);
    }
    events = {
      addUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      addAccessTokenExpired: vi.fn(),
      removeUserLoaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
      removeAccessTokenExpired: vi.fn(),
    };
    getUser = auth.getUser;
    signinRedirectCallback = auth.callback;
    signinRedirect = auth.signin;
    signinSilent = auth.renew;
    removeUser = auth.remove;
    clearStaleState = vi.fn();
  },
}));
let root: Root, host: HTMLDivElement, account: AccountAccess;
const owner = {
  expired: false,
  profile: {
    email: "mario.d.gerardi@gmail.com",
    email_verified: true,
    "cognito:groups": ["admin"],
  },
  access_token: "access",
  state: "/study",
} as unknown as User;
function Probe() {
  account = useAccount();
  return <span>{account.error}</span>;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  auth.settings.length = 0;
  auth.getUser.mockResolvedValue(null);
  auth.signin.mockResolvedValue(undefined);
  auth.callback.mockResolvedValue(owner);
  auth.remove.mockResolvedValue(undefined);
  history.replaceState(null, "", "/account");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () =>
    root.render(
      <AccountProvider>
        <Probe />
      </AccountProvider>,
    ),
  );
}
it("requires the verified owner, role membership, and an unexpired session", () => {
  expect(isAdmin(owner)).toBe(true);
  for (const user of [
    null,
    { ...owner, expired: true },
    { ...owner, profile: { ...owner.profile, email_verified: false } },
    { ...owner, profile: { ...owner.profile, email: "other@example.com" } },
    { ...owner, profile: { ...owner.profile, "cognito:groups": [] } },
  ]) {
    expect(isAdmin(user as User | null)).toBe(false);
  }
});
it("rejects external or token-bearing return destinations", () => {
  for (const path of [
    "//evil.test",
    "https://evil.test",
    "/auth/callback",
    "/study?token=secret",
    null,
  ])
    expect(safeReturnPath(path)).toBe("/account");
  expect(safeReturnPath("/study")).toBe("/study");
});
it("consumes a successful callback and removes authorization parameters", async () => {
  history.replaceState(null, "", "/auth/callback?code=secret&state=opaque");
  await mount();
  expect(account.admin).toBe(true);
  expect(location.pathname).toBe("/study");
  expect(location.search).toBe("");
});
it("recovers from a failed callback without showing provider errors or keeping secrets in the URL", async () => {
  auth.callback.mockRejectedValue(new Error("private provider details"));
  history.replaceState(null, "", "/auth/callback?code=secret&state=opaque");
  await mount();
  expect(account.user).toBeNull();
  expect(account.error).toContain("Please try again");
  expect(host.textContent).not.toContain("private");
  expect(location.href).not.toContain("secret");
});
it("sends account creation to Cognito signup with authorization code and session storage", async () => {
  await mount();
  await act(async () => account.signIn(true));
  const settings = auth.settings.at(-1)!;
  expect(settings.metadataSeed?.authorization_endpoint).toMatch(/\/signup$/);
  expect(settings.response_type).toBe("code");
  expect(settings.disablePKCE).not.toBe(true);
  expect(settings.automaticSilentRenew).toBe(false);
  expect(auth.signin).toHaveBeenCalledWith({ state: "/account" });
});
it("refreshes expired access credentials before an authenticated request and clears a failed renewal", async () => {
  auth.getUser.mockResolvedValue({ ...owner, expired: true });
  auth.renew.mockResolvedValue(owner);
  await mount();
  let token: string | undefined;
  await act(async () => {
    token = await account.accessToken();
  });
  expect(token).toBe("access");
  expect(auth.renew).toHaveBeenCalledOnce();
  auth.renew.mockRejectedValue(new Error("private token"));
  await act(async () => {
    await expect(account.accessToken()).rejects.toThrow("Please sign in again");
  });
  expect(account.user).toBeNull();
  expect(auth.remove).toHaveBeenCalledOnce();
});
