import { useState } from "react";
import type { CatalogStatus, RegistrationPreview } from "./registrationTypes";

const endpoint = "/__journey-workbench/register";
async function request<T>(
  query: Record<string, string>,
  commit = false,
): Promise<T> {
  const response = await fetch(
    commit ? endpoint : `${endpoint}?${new URLSearchParams(query)}`,
    commit
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
        }
      : undefined,
  );
  const result = await response.json();
  if (!response.ok) throw Error(result.error ?? "Catalog update failed.");
  return result as T;
}

/** Local source maintenance, separate from assignment publication. */
export function JourneyCatalogControls({ filename }: { filename: string }) {
  const [status, setStatus] = useState<CatalogStatus>();
  const [route, setRoute] = useState(
    `/journey/${filename
      .replace(/Journey\.ts$/, "")
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase()}`,
  );
  const [preview, setPreview] = useState<RegistrationPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function loadStatus() {
    setBusy(true);
    setError("");
    try {
      setStatus(
        await request<CatalogStatus>({ module: filename, action: "status" }),
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function change(commit: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await request<RegistrationPreview>(
        commit && preview
          ? {
              module: preview.module,
              route: preview.route,
              action: preview.action,
              revision: preview.revision,
            }
          : {
              module: filename,
              route: status?.route ?? route,
              action: status?.registered ? "remove" : "add",
            },
        commit,
      );
      if (!commit) setPreview(result);
      else {
        setPreview(undefined);
        setStatus({
          registered: result.action === "add",
          route: result.action === "add" ? result.route : undefined,
          canRemove: result.action === "add",
        });
        setMessage(
          result.action === "add"
            ? "Added to the local catalog. Automatic rotation is off."
            : "Removed from the local catalog. Source kept for review.",
        );
      }
    } catch (error) {
      setError((error as Error).message);
      if (commit) setPreview(undefined);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="workbench-catalog"
      onToggle={(event) => {
        if (event.currentTarget.open && !status && !busy) void loadStatus();
      }}
    >
      <summary>Catalog</summary>
      <div className="workbench-catalog-content">
        {status && (
          <div className="workbench-catalog-status">
            <span>Registration</span>
            <strong>
              {status.registered ? "Registered" : "Not registered"}
            </strong>
          </div>
        )}
        {status?.registered && !preview && (
          <p className="workbench-catalog-route">{status.route}</p>
        )}
        {status && !status.registered && !preview && (
          <>
            <label className="field">
              Journey route
              <input
                value={route}
                disabled={busy}
                onChange={(event) => setRoute(event.target.value)}
              />
            </label>
            <p className="workbench-catalog-note">
              Register to enable manual scheduling. Automatic rotation stays
              off.
            </p>
          </>
        )}
        {status?.reason && (
          <p className="workbench-catalog-note">{status.reason}</p>
        )}
        {preview ? (
          <div className="workbench-catalog-preview">
            <h4>
              {preview.action === "add" ? "Add" : "Remove"} {preview.title}?
            </h4>
            <dl className="workbench-catalog-facts">
              <dt>Route</dt>
              <dd className="workbench-catalog-route">{preview.route}</dd>
              {preview.action === "add" && (
                <>
                  <dt>Manual scheduling</dt>
                  <dd>Enabled</dd>
                  <dt>Automatic rotation</dt>
                  <dd>Off</dd>
                </>
              )}
            </dl>
            {preview.action === "add" ? (
              <p className="workbench-catalog-refresh">
                Adding this Journey will refresh the Workbench. Your current
                preview may reset.
              </p>
            ) : (
              <p className="workbench-catalog-note">
                Keep the Journey source available in Workbench.
              </p>
            )}
            <div className="workbench-catalog-actions">
              <button disabled={busy} onClick={() => void change(true)}>
                {preview.action === "add"
                  ? "Add to catalog"
                  : "Remove from catalog"}
              </button>
              <button
                disabled={busy}
                className="review-text-action"
                onClick={() => setPreview(undefined)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          status &&
          (!status.registered || status.canRemove) && (
            <button disabled={busy} onClick={() => void change(false)}>
              {status.registered ? "Preview removal" : "Preview registration"}
            </button>
          )
        )}
        {status && (
          <p className="workbench-catalog-footer">
            Local changes reach production after a release.
          </p>
        )}
        {busy && <p role="status">Updating catalog…</p>}
        {error && <p role="alert">{error}</p>}
        {!status && !busy && (
          <button onClick={() => void loadStatus()}>Retry</button>
        )}
        {message && <p role="status">{message}</p>}
      </div>
    </details>
  );
}
