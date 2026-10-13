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
import { serviceConfig } from "../src/services/config";

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  callback: vi.fn(),
  signin: vi.fn(),
  renew: vi.fn(),
  remove: vi.fn(),
  settings: [] as UserManagerSettings[],
  expiring: undefined as (() => void) | undefined,
}));
vi.mock("oidc-client-ts", () => ({
  WebStorageStateStore: class {
    constructor(public settings: { store: Storage }) {}
  },
  UserManager: class {
    constructor(settings: UserManagerSettings) {
      auth.settings.push(settings);
    }
    events = {
      addUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      addAccessTokenExpired: vi.fn(),
      addAccessTokenExpiring: vi.fn((callback: () => void) => {
        auth.expiring = callback;
      }),
      removeUserLoaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
      removeAccessTokenExpired: vi.fn(),
      removeAccessTokenExpiring: vi.fn(),
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
    sub: "player-a",
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
  auth.renew.mockImplementation(async () => {
    auth.getUser.mockResolvedValue(owner);
    return owner;
  });
  localStorage.clear();
  sessionStorage.clear();
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
  expect(safeReturnPath("/account?friend=Mars")).toBe("/account?friend=mars");
  expect(safeReturnPath("/account?friend=mars&token=secret")).toBe("/account");
  expect(safeReturnPath("/account?friend=//evil.test")).toBe("/account");
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
it("sends account creation to Cognito signup with PKCE, persistent user storage and tab-scoped redirect state", async () => {
  await mount();
  await act(async () => account.signIn(true));
  const settings = auth.settings.at(-1)!;
  expect(settings.metadataSeed?.authorization_endpoint).toMatch(/\/signup$/);
  expect(settings.response_type).toBe("code");
  expect(settings.disablePKCE).not.toBe(true);
  expect(settings.automaticSilentRenew).toBe(false);
  expect(settings.accessTokenExpiringNotificationTimeInSeconds).toBe(90);
  expect(
    (settings.userStore as unknown as { settings: { store: Storage } }).settings
      .store,
  ).toBe(localStorage);
  expect(
    (settings.stateStore as unknown as { settings: { store: Storage } })
      .settings.store,
  ).toBe(sessionStorage);
  expect(auth.signin).toHaveBeenCalledWith({ state: "/account" });
});
it("migrates an existing tab session without losing the signed-in account", async () => {
  const key = `oidc.user:${serviceConfig.auth.authority}:${serviceConfig.auth.clientId}`;
  sessionStorage.setItem(key, "existing-session");
  auth.getUser.mockResolvedValue(owner);
  await mount();
  expect(localStorage.getItem(key)).toBe("existing-session");
  expect(sessionStorage.getItem(key)).toBeNull();
  expect(account.user?.profile.sub).toBe("player-a");
});
it("shares expiry, focus and API renewal requests and recovers automatically after reconnecting", async () => {
  auth.getUser.mockResolvedValue(owner);
  await mount();
  auth.getUser.mockResolvedValue({ ...owner, expired: true });
  let resolve!: (user: User) => void;
  auth.renew.mockImplementation(
    () =>
      new Promise<User>((done) => {
        resolve = done;
      }),
  );
  let request!: Promise<string | undefined>;
  await act(async () => {
    auth.expiring!();
    dispatchEvent(new Event("focus"));
    request = account.accessToken();
  });
  expect(auth.renew).toHaveBeenCalledOnce();
  await act(async () => {
    auth.getUser.mockResolvedValue(owner);
    resolve(owner);
    await request;
  });
  expect(account.user?.expired).toBe(false);
  auth.getUser.mockResolvedValue({ ...owner, expired: true });
  auth.renew.mockRejectedValue(new Error("offline"));
  await act(async () => dispatchEvent(new Event("focus")));
  expect(account.user?.profile.sub).toBe("player-a");
  auth.renew.mockImplementation(async () => {
    auth.getUser.mockResolvedValue(owner);
    return owner;
  });
  await act(async () => dispatchEvent(new Event("online")));
  expect(account.error).toBe("");
  expect(account.user?.expired).toBe(false);
});
it("does not resurrect a session when another tab signs out during renewal", async () => {
  const key = `oidc.user:${serviceConfig.auth.authority}:${serviceConfig.auth.clientId}`;
  localStorage.setItem(key, JSON.stringify(owner));
  auth.getUser.mockImplementation(async () =>
    JSON.parse(localStorage.getItem(key) ?? "null"),
  );
  await mount();
  localStorage.setItem(key, JSON.stringify({ ...owner, expired: true }));
  let resolve!: (user: User) => void;
  auth.renew.mockImplementation(
    () =>
      new Promise<User>((done) => {
        resolve = done;
      }),
  );
  let request!: Promise<unknown>;
  await act(async () => {
    request = account.accessToken().catch((error: unknown) => error);
  });
  await act(async () => {
    localStorage.removeItem(key);
    dispatchEvent(new StorageEvent("storage", { key, newValue: null }));
  });
  await act(async () => {
    localStorage.setItem(key, JSON.stringify(owner));
    resolve(owner);
    await request;
  });
  expect(account.user).toBeNull();
  expect(localStorage.getItem(key)).toBeNull();
});
it("refreshes expired access credentials and retains the account cache after an offline renewal", async () => {
  auth.getUser.mockResolvedValue({ ...owner, expired: true });
  auth.renew.mockImplementation(async () => {
    auth.getUser.mockResolvedValue(owner);
    return owner;
  });
  await mount();
  let token: string | undefined;
  await act(async () => {
    token = await account.accessToken();
  });
  expect(token).toBe("access");
  expect(auth.renew).toHaveBeenCalledOnce();
  auth.getUser.mockResolvedValue({ ...owner, expired: true });
  auth.renew.mockRejectedValue(new Error("private token"));
  await act(async () => {
    await expect(account.accessToken()).rejects.toThrow(
      "Retry syncing or sign in again",
    );
  });
  expect(account.user?.profile.email).toBe(owner.profile.email);
  expect(auth.remove).not.toHaveBeenCalled();
});

it("preserves only valid comparison parameters through authentication", () => {
  const link =
    "/account?tab=friends&view=compare&date=2026-10-13&journey=beyond-the-maple-leaf-v1&version=1";
  expect(safeReturnPath(link)).toBe(link + "#journey-comparison");
  expect(safeReturnPath(link + "#journey-comparison")).toBe(
    link + "#journey-comparison",
  );
  expect(safeReturnPath(link + "#unrecognized")).toBe("/account");
  for (const invalid of [
    link + "&token=secret",
    link.replace("2026-10-13", "2026-02-30"),
    link.replace("version=1", "version=-1"),
    link + "&view=compare",
  ])
    expect(safeReturnPath(invalid)).toBe("/account");
});
