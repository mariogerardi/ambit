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
        {status && <p>{status.registered ? "Registered" : "Not registered"}</p>}
        {status?.registered && (
          <p className="workbench-catalog-route">{status.route}</p>
        )}
        {status && !status.registered && !preview && (
          <label className="field">
            Journey route
            <input
              value={route}
              disabled={busy}
              onChange={(event) => setRoute(event.target.value)}
            />
          </label>
        )}
        {status && (
          <p className="workbench-catalog-note">
            Local catalog changes require release before they reach production.
          </p>
        )}
        {status?.reason && (
          <p className="workbench-catalog-note">{status.reason}</p>
        )}
        {preview ? (
          <>
            <p>
              {preview.action === "add" ? "Add" : "Remove"}{" "}
              <strong>{preview.title}</strong>?
            </p>
            <p className="workbench-catalog-route">{preview.route}</p>
            <p className="workbench-catalog-note">
              {preview.action === "add"
                ? "Enable manual scheduling; keep automatic rotation off."
                : "Keep the Journey source available in Workbench."}
            </p>
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
          </>
        ) : (
          status &&
          (!status.registered || status.canRemove) && (
            <button disabled={busy} onClick={() => void change(false)}>
              {status.registered ? "Preview removal" : "Preview registration"}
            </button>
          )
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
