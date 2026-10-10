import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import type { User } from "oidc-client-ts";
import { serviceConfig } from "./config";
import { reportFailure } from "./monitoring";

export function isAdmin(user: User | null) {
  const groups = user?.profile["cognito:groups"];
  return (
    !!user &&
    !user.expired &&
    user.profile.email_verified === true &&
    user.profile.email?.toLowerCase() === "mario.d.gerardi@gmail.com" &&
    Array.isArray(groups) &&
    groups.includes("admin")
  );
}
export function safeReturnPath(value: unknown) {
  return typeof value === "string" &&
    /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(value) &&
    value !== "/auth/callback"
    ? value
    : "/account";
}
let manager: UserManager | undefined;
function createManager(signup = false) {
  return new UserManager({
    authority: serviceConfig.auth.authority,
    client_id: serviceConfig.auth.clientId,
    redirect_uri: `${location.origin}/auth/callback`,
    response_type: "code",
    scope: "openid email",
    // Renewal is coordinated below so expiry, focus and API calls share one request.
    automaticSilentRenew: false,
    accessTokenExpiringNotificationTimeInSeconds: 90,
    revokeTokenTypes: ["refresh_token"],
    userStore: new WebStorageStateStore({ store: localStorage }),
    stateStore: new WebStorageStateStore({ store: sessionStorage }),
    metadataSeed: {
      end_session_endpoint: `${serviceConfig.auth.loginUrl}/logout`,
      ...(signup
        ? { authorization_endpoint: `${serviceConfig.auth.loginUrl}/signup` }
        : {}),
    },
  });
}
const userStorageKey = `oidc.user:${serviceConfig.auth.authority}:${serviceConfig.auth.clientId}`;
function accountManager() {
  // Preserve existing signed-in tabs when upgrading from tab-only sessions.
  const legacy = sessionStorage.getItem(userStorageKey);
  if (legacy && !localStorage.getItem(userStorageKey))
    localStorage.setItem(userStorageKey, legacy);
  sessionStorage.removeItem(userStorageKey);
  return (manager ??= createManager());
}
export interface AccountAccess {
  user: User | null;
  admin: boolean;
  loading: boolean;
  busy: boolean;
  error: string;
  signIn(signup?: boolean): Promise<void>;
  signOut(): Promise<void>;
  accessToken(): Promise<string | undefined>;
}
const guest: AccountAccess = {
  user: null,
  admin: false,
  loading: false,
  busy: false,
  error: "",
  async signIn() {},
  async signOut() {},
  async accessToken() {
    return undefined;
  },
};
const Accounts = createContext<AccountAccess>(guest);
export const useAccount = () => useContext(Accounts);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const renewal = useRef<Promise<User | null> | undefined>(undefined);
  const signingOut = useRef(false);
  const renewalRetryAt = useRef(0);
  const storageEpoch = useRef(0);
  const externalUser = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    let client: UserManager;
    const loaded = (value: User) => {
      if (active && !signingOut.current) setUser(value);
    };
    const removed = () => {
      if (active) setUser(null);
    };
    const wake = (event?: unknown) => {
      if (
        event instanceof Event &&
        (event.type === "online" || event.type === "focus")
      )
        renewalRetryAt.current = 0;
      if (
        active &&
        !signingOut.current &&
        Date.now() >= renewalRetryAt.current &&
        document.visibilityState !== "hidden"
      )
        void accessToken().catch(() => {
          if (active)
            setError(
              "Couldn’t renew your session yet. We’ll retry when you reconnect.",
            );
        });
    };
    const storage = (event: StorageEvent) => {
      if (event.key !== userStorageKey && event.key !== null) return;
      storageEpoch.current++;
      externalUser.current = event.newValue;
      void client
        .getUser()
        .then((value) => {
          if (active && !signingOut.current) setUser(value);
        })
        .catch(() => {});
    };
    const expired = wake;
    void (async () => {
      try {
        client = accountManager();
        client.events.addUserLoaded(loaded);
        client.events.addUserUnloaded(removed);
        client.events.addAccessTokenExpired(expired);
        client.events.addAccessTokenExpiring(wake);
        addEventListener("focus", wake);
        addEventListener("online", wake);
        addEventListener("storage", storage);
        document.addEventListener("visibilitychange", wake);
        if (location.pathname === "/auth/callback") {
          const value = await client.signinRedirectCallback();
          if (!active) return;
          setUser(value);
          history.replaceState(null, "", safeReturnPath(value.state));
          dispatchEvent(new PopStateEvent("popstate"));
        } else {
          const value = await client.getUser();
          if (active) setUser(value);
          if (value)
            await accessToken().catch(() => {
              if (active)
                setError(
                  "Couldn’t renew your session yet. We’ll retry when you reconnect.",
                );
            });
        }
        await client.clearStaleState();
      } catch {
        if (active) {
          setError("Couldn’t finish signing in. Please try again.");
          if (location.pathname === "/auth/callback") {
            history.replaceState(null, "", "/account");
            dispatchEvent(new PopStateEvent("popstate"));
          }
          reportFailure("account sign-in");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      client?.events.removeUserLoaded(loaded);
      client?.events.removeUserUnloaded(removed);
      client?.events.removeAccessTokenExpired(expired);
      client?.events.removeAccessTokenExpiring(wake);
      removeEventListener("focus", wake);
      removeEventListener("online", wake);
      removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);
  async function signIn(signup = false) {
    setBusy(true);
    setError("");
    try {
      const client = signup ? createManager(true) : accountManager();
      await client.signinRedirect({
        state: safeReturnPath(location.pathname),
      });
    } catch {
      setError("Couldn’t open sign-in. Please try again.");
      reportFailure("account sign-in");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    signingOut.current = true;
    setBusy(true);
    setError("");
    try {
      const client = accountManager();
      await renewal.current?.catch(() => {});
      await client.revokeTokens(["refresh_token"]);
      await client.removeUser();
      setUser(null);
      const url = new URL(`${serviceConfig.auth.loginUrl}/logout`);
      url.searchParams.set("client_id", serviceConfig.auth.clientId);
      url.searchParams.set("logout_uri", `${location.origin}/`);
      location.assign(url.href);
    } catch {
      await manager?.removeUser().catch(() => {});
      setUser(null);
      setError(
        "Signed out on this device. Couldn’t close the hosted session; please try again.",
      );
      reportFailure("account sign-out");
    } finally {
      setBusy(false);
    }
  }
  async function accessToken() {
    const client = accountManager();
    let current = await client.getUser();
    if (!current || signingOut.current) return;
    if (
      current.expired ||
      (current.expires_at !== undefined &&
        current.expires_at <= Date.now() / 1000 + 90)
    ) {
      if (Date.now() < renewalRetryAt.current)
        throw new Error(
          "Couldn’t renew your session. Retry syncing or sign in again.",
        );
      try {
        const epoch = storageEpoch.current;
        renewal.current ??= client.signinSilent().finally(() => {
          renewal.current = undefined;
        });
        current = await renewal.current;
        if (epoch !== storageEpoch.current) {
          // A late refresh must not resurrect a session signed out in another tab,
          // or replace another account's credentials with the old account's token.
          if (externalUser.current === null)
            localStorage.removeItem(userStorageKey);
          else localStorage.setItem(userStorageKey, externalUser.current);
          setUser(await client.getUser());
          throw new Error("The account changed in another tab.");
        }
        renewalRetryAt.current = 0;
      } catch {
        renewalRetryAt.current = Date.now() + 30000;
        // Keep the account's cache selected during network/renewal failures.
        // Signing out explicitly is the boundary back to guest storage.
        throw new Error(
          "Couldn’t renew your session. Retry syncing or sign in again.",
        );
      }
    }
    if (signingOut.current) return;
    if (!current || current.expired)
      throw new Error("Your session has expired. Please sign in again.");
    setError("");
    setUser(current);
    return current?.access_token;
  }
  return (
    <Accounts.Provider
      value={{
        user,
        admin: isAdmin(user),
        loading,
        busy,
        error,
        signIn,
        signOut,
        accessToken,
      }}
    >
      {children}
    </Accounts.Provider>
  );
}
