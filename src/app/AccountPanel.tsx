import type { ReactNode } from "react";
import { useAccount } from "../services/accounts";
import { AccountDashboard } from "./AccountDashboard";
import type { DailyProgress } from "./dailyProgress";
import type { StudySave } from "../study/engine";
import type { AccountIntent, ComparisonTarget } from "./accountNavigation";
export function AccountPanel({
  sync,
  daily,
  study,
  intent,
  defaultComparison,
  onNavigate,
  adminContent,
}: {
  defaultComparison?: ComparisonTarget | null;
  intent?: AccountIntent;
  daily?: DailyProgress;
  study?: StudySave;
  sync?: { status: string; message: string; retry(): void };
  onNavigate?(url: string): void;
  adminContent?: ReactNode;
}) {
  const account = useAccount();
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
      <span className="overline">YOUR ACCOUNT</span>
      <h1>
        {intent?.friend
          ? `Connect with @${intent.friend}`
          : intent?.comparison
            ? "Compare your Journey with friends."
            : account.user
              ? "You’re signed in."
              : "Welcome to Ambit."}
      </h1>
      {account.loading ? (
        <p role="status">Checking your account…</p>
      ) : (
        <>
          <p>
            Create an account or sign in. You can also keep playing as a guest.
          </p>
          <p>
            Guest progress is saved on this device. Sign in to save Journey and
            Study progress across devices.
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
