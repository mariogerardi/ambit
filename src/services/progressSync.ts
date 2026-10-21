import { serviceConfig } from "./config";
import { RequestFailure, failureType } from "./requestFailure";
import { reportFailure } from "./monitoring";
import type { SaveEntry } from "../app/recordSave";

export type SyncStatus = "syncing" | "saved" | "offline" | "error";
export interface CloudEntry extends SaveEntry {
  namespace: "daily" | "study";
}
type CloudRevision = Omit<CloudEntry, "value">;
export interface SyncStore {
  readonly prefix: string;
  readonly writable: boolean;
  readonly ready?: Promise<void>;
  entries(): SaveEntry[];
  mergeEntries(entries: SaveEntry[]): void;
  mergeEntriesDurably?(entries: SaveEntry[]): Promise<void>;
}
export type ProgressStores = Record<CloudEntry["namespace"], SyncStore>;
const address = (entry: CloudRevision) =>
  JSON.stringify([entry.namespace, entry.field, entry.writer]);

export async function progressRequest<T>(
  token: string,
  signal: AbortSignal,
  body?: unknown,
  cursor?: string,
  manifest = false,
): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  const requestSignal = AbortSignal.any([signal, timeout]);
  const started = performance.now();
  const query = new URLSearchParams();
  if (cursor) query.set("cursor", cursor);
  if (manifest) query.set("manifest", "1");
  const url = `${serviceConfig.apiUrl}/account/saves${query.size ? `?${query}` : ""}`;
  let httpStatus = 0;
  let attempt = 0;
  try {
    for (attempt = 0; ; attempt++) {
      httpStatus = 0;
      const response = await fetch(url, {
        method: body ? "POST" : "GET",
        signal: requestSignal,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      httpStatus = response.status;
      if (response.status === 429 && attempt < 3) {
        await new Promise<void>((resolve, reject) => {
          const abort = () => {
            clearTimeout(timer);
            reject(requestSignal.reason);
          };
          const timer = setTimeout(
            () => {
              requestSignal.removeEventListener("abort", abort);
              resolve();
            },
            1000 * 2 ** attempt,
          );
          requestSignal.addEventListener("abort", abort, { once: true });
          if (requestSignal.aborted) abort();
        });
        continue;
      }
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Please sign in again to sync progress."
            : "Couldn’t sync progress. Please try again.",
        );
      return (await response.json()) as T;
    }
  } catch (error) {
    if (signal.aborted) throw error;
    throw new RequestFailure(
      httpStatus === 401
        ? "Please sign in again to sync progress."
        : httpStatus >= 400
          ? "Couldn’t sync progress. Please try again."
          : error instanceof TypeError || error instanceof DOMException
            ? "Couldn’t connect. Progress is saved on this device; syncing will retry."
            : "Couldn’t read cloud progress. Please try again.",
      {
        route: "/account/saves",
        method: body ? "POST" : "GET",
        httpStatus,
        errorType: timeout.aborted
          ? "timeout"
          : httpStatus >= 400
            ? "http"
            : failureType(error),
        elapsedMs: Math.round(performance.now() - started),
        attemptCount: attempt + 1,
        online: navigator.onLine,
      },
    );
  }
}

/** Local registers are the durable outbox. Restore before pushing, reuse recent
 * pulls for local edits, and acknowledge
 * only the exact revisions sent, so writes during a request remain pending. */
export class ProgressSync {
  private controller = new AbortController();
  private acknowledged = new Map<string, number>();
  private timer?: ReturnType<typeof setTimeout>;
  private poll?: ReturnType<typeof setInterval>;
  private running = false;
  private dirty = false;
  private failures = 0;
  private lastPull = -Infinity;
  private pullRequested = true;
  constructor(
    private stores: ProgressStores,
    private accessToken: () => Promise<string | undefined>,
    private status: (status: SyncStatus, message: string) => void,
    private request = progressRequest,
    private restored: () => void = () => {},
  ) {}
  private changed = (event: Event) => {
    if (
      event instanceof StorageEvent &&
      event.key !== null &&
      !Object.values(this.stores).some((store) =>
        event.key!.startsWith(store.prefix),
      )
    )
      return;
    if (
      event instanceof CustomEvent &&
      !Object.values(this.stores).some((store) => event.detail === store.prefix)
    )
      return;
    this.schedule(1200, false);
  };
  private wake = () => {
    if (document.visibilityState !== "hidden") this.schedule(0, false);
  };
  private reconnect = () => this.schedule(0);
  start() {
    addEventListener("ambit-save", this.changed);
    addEventListener("storage", this.changed);
    addEventListener("online", this.reconnect);
    addEventListener("focus", this.wake);
    document.addEventListener("visibilitychange", this.wake);
    this.poll = setInterval(this.wake, 300000);
    this.schedule(0);
  }
  stop() {
    this.controller.abort();
    clearTimeout(this.timer);
    clearInterval(this.poll);
    removeEventListener("ambit-save", this.changed);
    removeEventListener("storage", this.changed);
    removeEventListener("online", this.reconnect);
    removeEventListener("focus", this.wake);
    document.removeEventListener("visibilitychange", this.wake);
  }
  schedule(delay = 1200, pull = true) {
    this.pullRequested ||= pull;
    if (this.controller.signal.aborted) return;
    this.dirty = true;
    this.status(
      navigator.onLine ? "syncing" : "offline",
      navigator.onLine
        ? "Syncing your progress…"
        : "Offline. Progress is saved on this device and will sync when you reconnect.",
    );
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(false), delay);
  }
  private entries(): CloudEntry[] {
    return Object.entries(this.stores).flatMap(([namespace, store]) =>
      store
        .entries()
        .filter((entry) => !entry.field.startsWith("override."))
        .map((entry) => ({
          ...entry,
          namespace: namespace as CloudEntry["namespace"],
        })),
    );
  }
  async flush(pull = true) {
    if (this.running || this.controller.signal.aborted) return;
    clearTimeout(this.timer);
    this.running = true;
    this.dirty = false;
    const signal = this.controller.signal;
    try {
      await Promise.all(Object.values(this.stores).map((store) => store.ready));
      if (!Object.values(this.stores).every((store) => store.writable))
        throw new Error(
          "Saving on this device is unavailable. Cloud progress has not been changed.",
        );
      if (!navigator.onLine)
        throw new Error(
          "Offline. Progress is saved on this device and will sync when you reconnect.",
        );
      const token = await this.accessToken();
      if (!token) throw new Error("Please sign in again to sync progress.");
      if (signal.aborted) return;
      if (pull || this.pullRequested || Date.now() - this.lastPull >= 300000) {
        this.pullRequested = false;
        const revisions: (CloudEntry | CloudRevision)[] = [];
        let cursor: string | undefined;
        const cursors = new Set<string>();
        const manifest =
          this.acknowledged.size > 0 ||
          this.entries().some((entry) =>
            /^(run|history|session)\./.test(entry.field),
          );
        do {
          const page = await this.request<{
            entries: (CloudEntry | CloudRevision)[];
            cursor?: string;
          }>(token, signal, undefined, cursor, manifest);
          if (signal.aborted) return;
          if (
            !Array.isArray(page.entries) ||
            page.entries.some(
              (entry) =>
                !entry ||
                !["daily", "study"].includes(entry.namespace) ||
                entry.version !== 2 ||
                !Number.isSafeInteger(entry.clock) ||
                entry.clock < 0 ||
                typeof entry.field !== "string" ||
                typeof entry.writer !== "string",
            )
          )
            throw new Error("Couldn’t read cloud progress. Please try again.");
          revisions.push(...page.entries);
          cursor = page.cursor;
          if (cursor) {
            if (typeof cursor !== "string" || cursors.has(cursor))
              throw new Error(
                "Couldn’t read cloud progress. Please try again.",
              );
            cursors.add(cursor);
          }
        } while (cursor);
        // Old servers return full values for manifest requests; both deployment
        // orders remain safe. New servers return only revisions on refresh.
        const local = new Map(
          this.entries().map((entry) => [address(entry), entry]),
        );
        const remote: CloudEntry[] = [];
        const missing: CloudRevision[] = [];
        for (const revision of revisions) {
          if ("value" in revision) remote.push(revision);
          else if ((local.get(address(revision))?.clock ?? -1) < revision.clock)
            missing.push(revision);
        }
        while (missing.length) {
          const batch = missing.splice(0, 10);
          const result = await this.request<{ entries: CloudEntry[] }>(
            token,
            signal,
            {
              read: batch.map(({ namespace, writer, field }) => ({
                namespace,
                writer,
                field,
              })),
            },
          );
          if (signal.aborted) return;
          if (
            !Array.isArray(result.entries) ||
            result.entries.length !== batch.length ||
            result.entries.some(
              (entry) =>
                typeof entry !== "object" ||
                entry === null ||
                !("value" in entry) ||
                entry.version !== 2 ||
                !Number.isSafeInteger(entry.clock) ||
                !batch.some(
                  (revision) =>
                    address(revision) === address(entry) &&
                    entry.clock >= revision.clock,
                ),
            ) ||
            new Set(result.entries.map(address)).size !== batch.length
          )
            throw Error("Couldn’t read cloud progress. Please try again.");
          remote.push(...result.entries);
        }
        for (const namespace of ["daily", "study"] as const) {
          const store = this.stores[namespace];
          const entries = remote.filter(
            (entry) => entry.namespace === namespace,
          );
          if (!entries.length) continue;
          if (store.mergeEntriesDurably)
            await store.mergeEntriesDurably(entries);
          else store.mergeEntries(entries);
          if (signal.aborted) return;
          dispatchEvent(
            new CustomEvent("ambit-progress-received", {
              detail: store.prefix,
            }),
          );
        }
        this.restored();
        for (const entry of [...revisions, ...remote])
          this.acknowledged.set(address(entry), entry.clock);
        this.lastPull = Date.now();
      }
      const pending = this.entries().filter(
        (entry) => entry.clock > (this.acknowledged.get(address(entry)) ?? -1),
      );
      // Stay below both the record-count and UTF-8 request-size limits.
      const encoder = new TextEncoder();
      while (pending.length) {
        const batch: CloudEntry[] = [];
        let bytes = 20;
        while (pending.length && batch.length < 25) {
          const size = encoder.encode(JSON.stringify(pending[0])).length + 1;
          if (size > 950000)
            throw new Error(
              "A saved session is too large to sync. It remains on this device.",
            );
          if (batch.length && bytes + size > 950000) break;
          batch.push(pending.shift()!);
          bytes += size;
        }
        await this.request(token, signal, { entries: batch });
        if (signal.aborted) return;
        for (const entry of batch)
          this.acknowledged.set(address(entry), entry.clock);
      }
      this.failures = 0;
      if (
        this.entries().some(
          (entry) =>
            entry.clock > (this.acknowledged.get(address(entry)) ?? -1),
        )
      )
        this.dirty = true;
      if (!this.dirty)
        this.status(
          "saved",
          "Progress is saved to your account. Sign in on another device to continue.",
        );
    } catch (error) {
      if (signal.aborted) return;
      this.failures++;
      this.pullRequested = true;
      this.status(
        navigator.onLine ? "error" : "offline",
        error instanceof TypeError || error instanceof DOMException
          ? "Couldn’t connect. Progress is saved on this device; syncing will retry."
          : error instanceof Error
            ? error.message
            : "Couldn’t sync progress. Please try again.",
      );
      reportFailure(
        "progress sync",
        error instanceof RequestFailure
          ? error.context
          : { errorType: failureType(error), online: navigator.onLine },
        error instanceof RequestFailure ? error : undefined,
      );
      this.dirty = true;
    } finally {
      this.running = false;
      if (!signal.aborted && this.dirty) {
        clearTimeout(this.timer);
        this.timer = setTimeout(
          () => void this.flush(false),
          this.failures
            ? Math.min(60000, 5000 * 2 ** Math.min(this.failures - 1, 4))
            : 1200,
        );
      }
    }
  }
}
