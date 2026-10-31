import { lazy, useEffect } from "react";
import type { ReactNode } from "react";
import { useToast } from "./Toast";
import { useAccount } from "../services/accounts";
import type { DailyProgress } from "./dailyProgress";
import type { StudySave } from "../study/engine";
import { AccountTabs } from "./AccountTabs";
import { accountTabLink } from "./accountNavigation";
import type { AccountIntent, ComparisonTarget } from "./accountNavigation";
const AccountDashboard = lazy(() =>
  import("./AccountDashboard").then((m) => ({ default: m.AccountDashboard })),
);
export function AccountPanel({
  sync,
  daily,
  study,
  intent,
  defaultComparison,
  onNavigate,
  adminContent,
  appearanceContent,
  onJourney,
  journeyReady,
  onStudy,
}: {
  defaultComparison?: ComparisonTarget | null;
  intent?: AccountIntent;
  daily?: DailyProgress;
  study?: StudySave;
  sync?: { status: string; message: string; retry(): void };
  onNavigate?(url: string): void;
  adminContent?: ReactNode;
  appearanceContent?: ReactNode;
  onJourney?(): void;
  journeyReady?: boolean;
  onStudy?(): void;
}) {
  const account = useAccount();
  const { notify } = useToast();
  useEffect(() => {
    if (account.error) notify(account.error, { tone: "error" });
  }, [account.error, notify]);
  if (!account.loading && account.user)
    return (
      <>
        <AccountDashboard
          defaultComparison={defaultComparison}
          intent={intent}
          subject={account.user.profile.sub}
          email={account.user.profile.email}
          daily={daily}
          study={study}
          sync={sync}
          onSignOut={() => void account.signOut()}
          busy={account.busy}
          onNavigate={onNavigate}
          adminContent={adminContent}
          appearanceContent={appearanceContent}
          onJourney={onJourney}
          journeyReady={journeyReady}
          onStudy={onStudy}
        />
        {account.error && (
          <p className="account-auth-error" role="alert">
            {account.error}
          </p>
        )}
        {account.user.expired && (
          <button
            className="quiet-button tertiary-action"
            data-dd-action-name="Account Sign In Again"
            disabled={account.busy}
            onClick={() => void account.signIn()}
          >
            Sign in again
          </button>
        )}
      </>
    );
  if (intent?.tab === "admin" && adminContent) return adminContent;
  return (
    <section className="info-view account-panel" aria-label="Account">
      <h1>
        {intent?.friend
          ? `Connect with @${intent.friend}`
          : intent?.comparison
            ? "Compare your Journey with friends."
            : account.user
              ? "You’re signed in."
              : "Welcome to Ambit."}
      </h1>
      <AccountTabs
        guest
        active={intent?.tab === "appearance" ? "appearance" : "profile"}
        onSelect={(tab) => onNavigate?.(accountTabLink(tab))}
      />
      {intent?.tab === "appearance" ? (
        appearanceContent
      ) : (
        <>
          {account.loading ? (
            <p role="status">Checking your account…</p>
          ) : (
            <>
              <p>
                Create an account or sign in. You can also keep playing as a
                guest.
              </p>
              <p>
                Guest progress is saved on this device. Sign in to save Journey
                and Study progress across devices.
              </p>
              <div className="account-actions">
                <button
                  className="primary-button"
                  data-dd-action-name="Account Sign In"
                  disabled={account.busy}
                  onClick={() => void account.signIn()}
                >
                  Sign in
                </button>
                <button
                  className="quiet-button tertiary-action"
                  data-dd-action-name="Account Create Account"
                  disabled={account.busy}
                  onClick={() => void account.signIn(true)}
                >
                  Create account
                </button>
              </div>
            </>
          )}
          {account.error && <p role="alert">{account.error}</p>}
        </>
      )}
    </section>
  );
}

export function AdminAccess({
  children,
  onAccount,
}: {
  children: ReactNode;
  onAccount(): void;
}) {
  const account = useAccount();
  if (account.loading)
    return (
      <section className="info-view" role="status">
        Checking admin access…
      </section>
    );
  if (account.admin) return children;
  return (
    <section className="info-view" aria-label="Admin access">
      <h1>Admin access required.</h1>
      <p>Sign in with the administrator account to continue.</p>
      <button
        className="primary-button"
        data-dd-action-name="Account Open Account"
        onClick={onAccount}
      >
        Go to account
      </button>
    </section>
  );
}
