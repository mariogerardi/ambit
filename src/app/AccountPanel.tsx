import type { ReactNode } from "react";
import { useAccount } from "../services/accounts";
export function AccountPanel({
  sync,
}: {
  sync?: { status: string; message: string; retry(): void };
}) {
  const account = useAccount();
  return (
    <section className="info-view account-panel" aria-label="Account">
      <span className="overline">YOUR ACCOUNT</span>
      <h1>{account.user ? "You’re signed in." : "Welcome to Ambit."}</h1>
      {account.loading ? (
        <p role="status">Checking your account…</p>
      ) : account.user ? (
        <>
          <p>{account.user.profile.email}</p>
          <p role="status">
            {sync?.message ?? "Preparing to sync your progress…"}
          </p>
          {sync && (sync.status === "error" || sync.status === "offline") && (
            <button
              className="quiet-button tertiary-action"
              onClick={sync.retry}
            >
              Retry sync
            </button>
          )}
          {account.user.expired && (
            <button
              className="quiet-button tertiary-action"
              disabled={account.busy}
              onClick={() => void account.signIn()}
            >
              Sign in again
            </button>
          )}
          <button
            className="primary-button"
            disabled={account.busy}
            onClick={() => void account.signOut()}
          >
            Sign out
          </button>
        </>
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
              disabled={account.busy}
              onClick={() => void account.signIn()}
            >
              Sign in
            </button>
            <button
              className="quiet-button tertiary-action"
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
      <button className="primary-button" onClick={onAccount}>
        Go to account
      </button>
    </section>
  );
}
