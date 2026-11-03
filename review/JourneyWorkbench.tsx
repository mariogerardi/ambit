import { useState } from "react";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import type { Journey } from "../src/game/questionContracts";
import type { RegistrationPreview } from "./registrationTypes";

export function JourneyWorkbench({
  journey,
  filename,
  modules,
  seed,
  request,
}: {
  journey: Journey;
  filename: string;
  modules: string[];
  seed: number;
  request: typeof fetch;
}) {
  const registered = JOURNEY_INDEX.some((j) => j.id === journey.id);
  const [route, setRoute] = useState(
    `/journey/${journey.id.replace(/-v\d+$/, "")}`,
  );
  const [preview, setPreview] = useState<RegistrationPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function registration(commit: boolean) {
    setBusy(true);
    setError("");
    try {
      const url = "/__journey-workbench/register";
      const response = await request(
        commit
          ? url
          : `${url}?${new URLSearchParams({ module: filename, route })}`,
        commit
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                module: filename,
                route,
                revision: preview?.revision,
              }),
            }
          : undefined,
      );
      const result = (await response.json()) as RegistrationPreview & {
        error?: string;
      };
      if (!response.ok) throw Error(result.error ?? "Registration failed.");
      if (commit) {
        setSaved(true);
        setPreview(undefined);
      } else setPreview(result);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Registration failed.",
      );
      setPreview(undefined);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="journey-workbench">
      <form id="workbench-source" action="/review/journeys.html">
        <label>
          Journey{" "}
          <select name="module" defaultValue={filename} disabled={busy}>
            {modules.map((name) => (
              <option key={name} value={name}>
                {name === filename
                  ? journey.title
                  : (JOURNEY_INDEX.find((entry) => entry.module === `./${name}`)
                      ?.title ??
                    name
                      .replace(/Journey\.ts$/, "")
                      .replace(/([a-z])([A-Z])/g, "$1 $2")
                      .replace(/^./, (letter) => letter.toUpperCase()))}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="quiet-button" disabled={busy}>
          Open Journey
        </button>
      </form>
      <details className="workbench-advanced">
        <summary>Seed and source</summary>
        <label>
          Seed{" "}
          <input
            name="seed"
            type="number"
            defaultValue={seed}
            form="workbench-source"
            disabled={busy}
          />
        </label>
        <p className="muted">{filename}</p>
      </details>
      {registered || saved ? (
        <p role="status">
          Registered in the local catalog.{" "}
          {saved && "Held out of automatic Daily selection. "}Date assignment
          and deployment are separate.
        </p>
      ) : (
        <details>
          <summary>Register Journey</summary>
          <p>
            Add this draft to the local Journey library for review and date
            assignment. It will be held out of automatic Daily selection.
          </p>
          <label className="field">
            Journey route{" "}
            <input
              value={route}
              disabled={busy}
              onChange={(event) => {
                setRoute(event.target.value);
                setPreview(undefined);
              }}
            />
          </label>
          {preview ? (
            <>
              <p>
                <strong>{preview.title}</strong> · {preview.id}
                <br />
                {preview.route}
              </p>
              <p>
                The Journey audit passed. No date is assigned by registration.
              </p>
              <details>
                <summary>Files to update</summary>
                <ul>
                  {preview.files.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              </details>

              <div className="admin-review-states">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void registration(true)}
                >
                  {busy ? "Registering…" : "Register in local catalog"}
                </button>
                <button
                  type="button"
                  className="quiet-button"
                  disabled={busy}
                  onClick={() => setPreview(undefined)}
                >
                  Back
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="quiet-button"
              disabled={busy}
              onClick={() => void registration(false)}
            >
              {busy ? "Checking draft…" : "Preview registration"}
            </button>
          )}
        </details>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
