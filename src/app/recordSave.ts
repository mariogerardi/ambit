import { isRecord, readSave } from "./storage";

type Fields = Record<string, unknown>;
export interface SaveEntry {
  version: 2;
  clock: number;
  writer: string;
  field: string;
  value: unknown;
}
export interface SaveCodec<T> {
  empty: T;
  valid(value: unknown): value is T;
  recover(value: unknown): T | undefined;
  encode(value: T): Fields;
  decode(fields: Fields): T;
  accepts(field: string, value: unknown): boolean;
  /** Entries arrive in revision order; preserve forward progress if required. */
  resolve?(field: string, previous: unknown, next: unknown): unknown;
  projection?(value: T): unknown;
  retain?(field: string): boolean;
}
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Independent writer/field registers avoid the read-modify-write race of a
 * shared LocalStorage blob. The v1 value is a compatibility projection only;
 * durable registers are authoritative once migrated. History is written once
 * per result, never serialized with each keystroke. */
export class RecordSave<T> {
  readonly prefix: string;
  readonly writer = crypto.randomUUID();
  writable: boolean;
  readonly recovered: boolean;
  private baseline: T;
  private clock = 0;

  constructor(
    readonly key: string,
    private codec: SaveCodec<T>,
  ) {
    this.prefix = `${key}.records.v2/`;
    try {
      if (localStorage.getItem(`${this.prefix}migrated`) === "2") {
        this.baseline = codec.empty;
        this.writable = true;
        this.recovered = false;
        this.baseline = this.snapshot();
        return;
      }
    } catch {
      /* The normal reader reports unavailable storage below. */
    }
    const saved = readSave(key, codec.empty, codec.valid, codec.recover);
    this.baseline = saved.value;
    this.writable = saved.available && saved.writable !== false;
    this.recovered = !!saved.recovered;
    if (this.writable) {
      try {
        // Keep an immutable migration base, so a stale compatibility projection
        // can never become the source of truth on a later visit.
        for (const [field, value] of Object.entries(
          codec.encode(saved.value),
        )) {
          const address = this.address(field, "legacy");
          if (localStorage.getItem(address) === null)
            localStorage.setItem(
              address,
              JSON.stringify({
                version: 2,
                clock: 0,
                writer: "legacy",
                field,
                value,
              } satisfies SaveEntry),
            );
        }
        this.baseline = this.snapshot();
        // Publish completion only after every legacy record is durable. A
        // interrupted migration is resumed from the untouched original save.
        localStorage.setItem(`${this.prefix}migrated`, "2");
        if (saved.recovered || localStorage.getItem(key) === null)
          try {
            localStorage.setItem(
              key,
              JSON.stringify(
                codec.projection?.(this.baseline) ?? this.baseline,
              ),
            );
          } catch {
            /* Registers are already durable. */
          }
      } catch {
        this.writable = false;
      }
    }
  }
  private address(field: string, writer: string = this.writer) {
    return `${this.prefix}${encodeURIComponent(field)}/${writer}`;
  }
  entries(): SaveEntry[] {
    const entries: SaveEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.prefix)) continue;
      try {
        const entry: unknown = JSON.parse(localStorage.getItem(key)!);
        if (
          !isRecord(entry) ||
          entry.version !== 2 ||
          !Number.isSafeInteger(entry.clock) ||
          Number(entry.clock) < 0 ||
          typeof entry.writer !== "string" ||
          typeof entry.field !== "string" ||
          key !== this.address(entry.field, entry.writer) ||
          !this.codec.accepts(entry.field, entry.value)
        )
          continue;
        entries.push(entry as unknown as SaveEntry);
        this.clock = Math.max(this.clock, Number(entry.clock));
      } catch {
        /* Leave a damaged register intact; other records still load. */
      }
    }
    return entries;
  }
  /** Keep the React baseline intact until incoming() captures queued edits. */
  mergeEntries(entries: SaveEntry[]) {
    if (!this.writable) throw new Error("Local saving is unavailable.");
    for (const entry of entries) {
      if (
        entry.version !== 2 ||
        !Number.isSafeInteger(entry.clock) ||
        entry.clock < 0 ||
        typeof entry.writer !== "string" ||
        !entry.writer ||
        entry.writer.includes("/") ||
        typeof entry.field !== "string" ||
        !this.codec.accepts(entry.field, entry.value)
      )
        continue;
      const address = this.address(entry.field, entry.writer);
      const raw = localStorage.getItem(address);
      if (raw) {
        try {
          const previous = JSON.parse(raw);
          if (
            previous.version === 2 &&
            previous.field === entry.field &&
            previous.writer === entry.writer &&
            Number.isSafeInteger(previous.clock) &&
            previous.clock >= entry.clock &&
            this.codec.accepts(previous.field, previous.value)
          )
            continue;
        } catch {
          /* Repair a damaged register. */
        }
      }
      localStorage.setItem(address, JSON.stringify(entry));
      this.clock = Math.max(this.clock, entry.clock);
    }
  }
  private snapshot(): T {
    const entries = this.entries();
    entries.sort(
      (a, b) => a.clock - b.clock || a.writer.localeCompare(b.writer),
    );
    const fields: Fields = {};
    for (const entry of entries)
      fields[entry.field] =
        entry.field in fields && this.codec.resolve
          ? this.codec.resolve(entry.field, fields[entry.field], entry.value)
          : entry.value;
    return this.codec.decode(fields);
  }
  load(): T {
    if (this.writable) this.baseline = this.snapshot();
    return this.baseline;
  }
  /** Capture the pre-event baseline before React applies queued local actions.
   * The returned merge is pure, including when React invokes an updater twice. */
  incoming(): (local: T) => T {
    const before = this.codec.encode(this.baseline);
    const remote = this.load();
    const remoteFields = this.codec.encode(remote);
    return (local) => {
      const after = this.codec.encode(local);
      const fields = { ...remoteFields };
      for (const field of new Set([
        ...Object.keys(before),
        ...Object.keys(after),
      ])) {
        if (
          equal(before[field], after[field]) ||
          (after[field] === undefined && this.codec.retain?.(field))
        )
          continue;
        const value = after[field] ?? null;
        fields[field] =
          field in fields && this.codec.resolve
            ? this.codec.resolve(field, fields[field], value)
            : value;
      }
      return this.codec.decode(fields);
    };
  }
  save(value: T): { value: T; ok: boolean } {
    if (!this.writable || !this.codec.valid(value)) return { value, ok: false };
    const before = this.codec.encode(this.baseline),
      after = this.codec.encode(value);
    const changed = [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].filter(
      (field) =>
        !equal(before[field], after[field]) &&
        !(after[field] === undefined && this.codec.retain?.(field)),
    );
    if (!changed.length) return { value: this.baseline, ok: true };
    try {
      this.snapshot(); // Observe other writers before choosing a logical clock.
      for (const field of changed) {
        const entry: SaveEntry = {
          version: 2,
          clock: ++this.clock,
          writer: this.writer,
          field,
          value: after[field] ?? null,
        };
        localStorage.setItem(this.address(field), JSON.stringify(entry));
      }
      const merged = this.snapshot();
      this.baseline = merged;
      // Only refresh the old projection when data changed. It is expendable:
      // quota failure here must not undo successful durable record writes.
      if (changed.length)
        try {
          localStorage.setItem(
            this.key,
            JSON.stringify(this.codec.projection?.(merged) ?? merged),
          );
        } catch {
          /* Durable records remain saved. */
        }
      dispatchEvent(new CustomEvent("ambit-save", { detail: this.prefix }));
      return { value: merged, ok: true };
    } catch {
      return { value, ok: false };
    }
  }
  matches(key: string | null) {
    return key === null || !!key?.startsWith(this.prefix);
  }
}
