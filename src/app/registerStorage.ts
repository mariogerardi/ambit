/** IndexedDB holds history; LocalStorage is a synchronous, durable write journal.
 * Never remove a journal entry until the matching database transaction commits. */
const MARKER = "ambit.progress.indexeddb.v1";
const prefixFor = (key: string) =>
  key.slice(0, key.indexOf(".records.v2/") + 12);
const isRegister = (key: string) =>
  key.includes(".records.v2/") &&
  key.slice(key.indexOf(".records.v2/") + 12).includes("/");
const complete = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () =>
      reject(tx.error ?? Error("Progress database transaction failed."));
  });
const request = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export class RegisterStorage {
  private db?: IDBDatabase;
  private values = new Map<string, string>();
  private revisions = new Map<string, number>();
  private pending = new Map<string, string>();
  private flushing?: Promise<boolean>;
  private initialized?: Promise<void>;
  private channel?: BroadcastChannel;
  available = true;
  get persistent() {
    return !!this.db;
  }

  initialize() {
    return (this.initialized ??= this.open());
  }
  private async open() {
    if (typeof indexedDB === "undefined") {
      try {
        this.available = !localStorage.getItem(MARKER);
      } catch {
        this.available = false;
      }
      return;
    }
    try {
      const open = indexedDB.open("ambit-player-progress", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("records");
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        let blocked = false;
        open.onsuccess = () =>
          blocked ? open.result.close() : resolve(open.result);
        open.onerror = () => reject(open.error);
        open.onblocked = () => {
          blocked = true;
          reject(Error("Progress database is busy. Please reload."));
        };
      });
      this.db.onversionchange = () => {
        this.db?.close();
        this.available = false;
      };
      addEventListener("storage", this.changed);
      if (typeof BroadcastChannel !== "undefined") {
        this.channel = new BroadcastChannel("ambit-player-progress");
        this.channel.onmessage = ({ data }: MessageEvent<unknown>) => {
          if (!Array.isArray(data)) return;
          const prefixes = new Set<string>();
          for (const row of data)
            if (
              Array.isArray(row) &&
              row.length === 2 &&
              typeof row[0] === "string" &&
              typeof row[1] === "string" &&
              isRegister(row[0])
            ) {
              this.observe(row[0], row[1]);
              prefixes.add(prefixFor(row[0]));
            }
          for (const prefix of prefixes)
            dispatchEvent(
              new CustomEvent("ambit-progress-received", { detail: prefix }),
            );
        };
      }
      const tx = this.db.transaction("records");
      const store = tx.objectStore("records");
      const [keys, values] = await Promise.all([
        request(store.getAllKeys()),
        request(store.getAll()),
      ]);
      for (let i = 0; i < keys.length; i++)
        this.observe(String(keys[i]), values[i]);
      // Any interrupted migration or uncommitted edit remains in the journal.
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isRegister(key)) {
          const raw = localStorage.getItem(key);
          if (raw !== null) {
            this.observe(key, raw);
            this.pending.set(key, raw);
          }
        }
      }
      if (await this.flush()) localStorage.setItem(MARKER, "1");
    } catch {
      // A previously migrated profile must not fall back to an incomplete journal.
      this.available = false;
    }
  }
  private observe(key: string, raw: string) {
    if (this.values.get(key) === raw) return;
    // A delayed storage event must not replace a newer committed revision.
    const previous = this.values.get(key);
    if (previous) {
      try {
        const a = JSON.parse(previous),
          b = JSON.parse(raw);
        if (a.clock > b.clock) return;
      } catch {
        /* Malformed records stay available to the recovery reader. */
      }
    }
    this.values.set(key, raw);
    const prefix = prefixFor(key);
    this.revisions.set(prefix, (this.revisions.get(prefix) ?? 0) + 1);
  }
  private changed = (event: StorageEvent) => {
    if (!event.key || !isRegister(event.key) || event.newValue === null) return;
    this.observe(event.key, event.newValue);
    this.pending.set(event.key, event.newValue);
    void this.flush();
  };
  revision(prefix: string) {
    return this.db ? (this.revisions.get(prefix) ?? 0) : undefined;
  }
  entries(prefix: string): [string, string][] {
    if (this.db)
      return [...this.values].filter(([key]) => key.startsWith(prefix));
    const values: [string, string][] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix))
        values.push([key, localStorage.getItem(key)!]);
    }
    return values;
  }
  getItem(key: string) {
    return this.db ? (this.values.get(key) ?? null) : localStorage.getItem(key);
  }
  setItem(key: string, raw: string) {
    if (!this.available) throw Error("Progress storage is unavailable.");
    localStorage.setItem(key, raw);
    if (this.db) {
      this.observe(key, raw);
      this.pending.set(key, raw);
      queueMicrotask(() => void this.flush());
    }
  }
  flush(): Promise<boolean> {
    if (!this.db) return Promise.resolve(true);
    if (this.flushing) return this.flushing;
    this.flushing = this.commit().finally(() => {
      this.flushing = undefined;
    });
    return this.flushing;
  }
  /** Restores have a durable cloud/guest source and need no temporary journal. */
  async import(entries: [string, string][]) {
    if (!this.db || !this.available)
      throw Error("Progress database is unavailable.");
    if (!(await this.flush())) throw Error("Progress could not be committed.");
    const applied = await this.persist(entries);
    for (const [key, raw] of applied) this.observe(key, raw);
    this.channel?.postMessage(applied);
  }
  private async persist(batch: [string, string][]) {
    const applied: [string, string][] = [];
    const tx = this.db!.transaction("records", "readwrite");
    const done = complete(tx);
    const store = tx.objectStore("records");
    for (const [key, raw] of batch) {
      const read = store.get(key);
      read.onsuccess = () => {
        let newer = false;
        try {
          newer = JSON.parse(read.result).clock > JSON.parse(raw).clock;
        } catch {
          /* First or damaged entry. */
        }
        if (!newer) store.put(raw, key);
        applied.push([key, newer ? read.result : raw]);
      };
    }
    await done;
    return applied;
  }
  private async commit() {
    try {
      while (this.pending.size) {
        const batch = [...this.pending];
        const applied = await this.persist(batch);
        const changed = new Set<string>();
        for (const [key, raw] of applied)
          if (this.values.get(key) !== raw) {
            this.observe(key, raw);
            changed.add(prefixFor(key));
          }
        for (const [key, raw] of batch) {
          if (localStorage.getItem(key) === raw) localStorage.removeItem(key);
          if (this.pending.get(key) === raw) this.pending.delete(key);
        }
        for (const prefix of changed)
          dispatchEvent(
            new CustomEvent("ambit-progress-received", { detail: prefix }),
          );
      }
      return true;
    } catch {
      return false;
    } // The synchronous journal remains authoritative.
  }
  close() {
    removeEventListener("storage", this.changed);
    this.db?.close();
    this.channel?.close();
  }
}

export const registerStorage = new RegisterStorage();
