import { createContext, useContext, useEffect, useState } from "react";
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
    automaticSilentRenew: false,
    revokeTokenTypes: ["refresh_token"],
    userStore: new WebStorageStateStore({ store: sessionStorage }),
    stateStore: new WebStorageStateStore({ store: sessionStorage }),
    metadataSeed: {
      end_session_endpoint: `${serviceConfig.auth.loginUrl}/logout`,
      ...(signup
        ? { authorization_endpoint: `${serviceConfig.auth.loginUrl}/signup` }
        : {}),
    },
  });
}
function accountManager() {
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
  useEffect(() => {
    let active = true;
    let client: UserManager;
    const loaded = (value: User) => {
      if (active) setUser(value);
    };
    const removed = () => {
      if (active) setUser(null);
    };
    void (async () => {
      try {
        client = accountManager();
        client.events.addUserLoaded(loaded);
        client.events.addUserUnloaded(removed);
        client.events.addAccessTokenExpired(removed);
        if (location.pathname === "/auth/callback") {
          const value = await client.signinRedirectCallback();
          if (!active) return;
          setUser(value);
          history.replaceState(null, "", safeReturnPath(value.state));
          dispatchEvent(new PopStateEvent("popstate"));
        } else {
          const value = await client.getUser();
          if (active) setUser(value?.expired ? null : value);
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
      client?.events.removeAccessTokenExpired(removed);
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
    setBusy(true);
    setError("");
    try {
      const client = accountManager();
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
    if (!current) return;
    if (current.expired) {
      try {
        current = await client.signinSilent();
      } catch {
        await client.removeUser();
        setUser(null);
        throw new Error("Your session expired. Please sign in again.");
      }
    }
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
