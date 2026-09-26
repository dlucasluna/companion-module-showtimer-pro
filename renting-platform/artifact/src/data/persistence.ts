import { COLLECTIONS, type CollectionName, type DemoState } from "./types";

/**
 * Where the artifact keeps its data:
 * - "cloud": the artifact's own `db` capability (survives reloads, devices, republishes)
 * - "local": this browser's localStorage (when db is not available in this view)
 * - "memory": nothing is kept (private windows, previews)
 */
export type StorageMode = "cloud" | "local" | "memory";

export type Dirty = { collection: CollectionName; id: string } | { doc: "company" | "activity" };

export interface Adapter {
  mode: StorageMode;
  load(): Promise<DemoState | null>;
  save(state: DemoState, dirty: Dirty[]): void;
  replaceAll(state: DemoState): Promise<void>;
  onStatus(fn: (pending: number, error: string | null) => void): void;
}

const SCHEMA_VERSION = 1;
const LOCAL_KEY = "ctr-artifact-state-v1";

// ─── Minimal typing of the db capability (see the platform's db.d.ts) ────────

interface DocSnap {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface DocRef {
  get(): Promise<DocSnap>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface Query {
  get(): Promise<{ docs: DocSnap[] }>;
}
interface CollRef {
  limit(n: number): Query;
}
interface Db {
  doc(path: string): DocRef;
  collection(path: string): CollRef;
}

interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Documents are plain JSON: drops `undefined` fields and copies the record. */
const toJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

// ─── Cloud (db capability) ──────────────────────────────────────────────────

interface QueueEntry {
  value: Record<string, unknown> | null;
  dirty: boolean;
  running: Promise<void> | null;
}

function cloudAdapter(db: Db): Adapter {
  // One write in flight per document; a newer value replaces a queued one.
  const queue = new Map<string, QueueEntry>();
  let listener: (pending: number, error: string | null) => void = () => undefined;
  let lastError: string | null = null;
  let seedRemaining = 0;
  /** Latest app state — seeding writes it (not a stale copy) as it goes. */
  let latest: DemoState | null = null;

  const notify = () => listener(queue.size + seedRemaining, lastError);

  async function write(path: string, value: Record<string, unknown> | null) {
    const ref = db.doc(path);
    const attempt = () => (value ? ref.set(value) : ref.delete());
    try {
      await attempt();
    } catch (error) {
      const code = isRecord(error) ? error.code : undefined;
      if (code !== "unavailable" && code !== "resource_exhausted") throw error;
      await new Promise((r) => setTimeout(r, code === "resource_exhausted" ? 1500 : 400 + Math.random() * 600));
      await attempt();
    }
  }

  async function drain(path: string, entry: QueueEntry) {
    try {
      while (entry.dirty) {
        entry.dirty = false;
        await write(path, entry.value);
      }
      lastError = null;
    } catch (error) {
      lastError = isRecord(error) && typeof error.message === "string" ? error.message : "Falha ao guardar";
      console.error("[artifact] save failed", path, error);
    } finally {
      entry.running = null;
      if (entry.dirty) entry.running = drain(path, entry);
      else queue.delete(path);
      notify();
    }
  }

  function enqueue(path: string, value: Record<string, unknown> | null): Promise<void> {
    const entry = queue.get(path) ?? { value, dirty: false, running: null };
    entry.value = value;
    entry.dirty = true;
    queue.set(path, entry);
    entry.running ??= drain(path, entry);
    notify();
    return entry.running;
  }

  function valueFor(state: DemoState, ref: Dirty): [string, Record<string, unknown> | null] {
    if ("doc" in ref) {
      return ref.doc === "company" ? ["settings/company", toJson(state.company)] : ["settings/activity", toJson({ items: state.activity.slice(0, 60) })];
    }
    const record = state[ref.collection][ref.id];
    return [`${ref.collection}/${ref.id}`, record ? toJson(record) : null];
  }

  return {
    mode: "cloud",
    onStatus(fn) {
      listener = fn;
    },
    async load() {
      const meta = await db.doc("settings/meta").get();
      const version = meta.exists ? meta.data()?.version : undefined;
      if (version !== SCHEMA_VERSION) return null;
      const [company, activity, ...collections] = await Promise.all([
        db.doc("settings/company").get(),
        db.doc("settings/activity").get(),
        ...COLLECTIONS.map((name) => db.collection(name).limit(1000).get()),
      ]);
      if (!company.exists) return null;
      const state = { company: company.data(), activity: (activity.data()?.items as unknown[]) ?? [] } as unknown as DemoState;
      COLLECTIONS.forEach((name, index) => {
        const docs = collections[index]!.docs;
        (state as unknown as Record<string, Record<string, unknown>>)[name] = Object.fromEntries(docs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
      });
      latest = state;
      return state;
    },
    save(state, dirty) {
      latest = state;
      for (const ref of dirty) void enqueue(...valueFor(state, ref));
    },
    async replaceAll(state) {
      latest = state;
      const refs: Dirty[] = [{ doc: "company" }, { doc: "activity" }];
      for (const name of COLLECTIONS) for (const id of Object.keys(state[name])) refs.push({ collection: name, id });
      seedRemaining = refs.length;
      notify();
      try {
        await write("settings/meta", null);
        // Remove documents the new state no longer has (a reset after edits).
        for (const name of COLLECTIONS) {
          const existing = await db.collection(name).limit(1000).get();
          for (const doc of existing.docs) if (!latest[name][doc.id]) await enqueue(`${name}/${doc.id}`, null);
        }
        // Sequential on purpose: the store limits concurrent writes.
        for (const ref of refs) {
          await enqueue(...valueFor(latest, ref));
          seedRemaining -= 1;
          notify();
        }
        await write("settings/meta", { version: SCHEMA_VERSION, seededAt: new Date().toISOString() });
      } finally {
        seedRemaining = 0;
        notify();
      }
    },
  };
}

// ─── Local (this browser only) ──────────────────────────────────────────────

function localAdapter(): Adapter {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const persist = (state: DemoState) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ version: SCHEMA_VERSION, state }));
    } catch (error) {
      console.warn("[artifact] local save failed", error);
    }
  };
  return {
    mode: "local",
    onStatus: () => undefined,
    async load() {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        const parsed = raw ? (JSON.parse(raw) as { version: number; state: DemoState }) : null;
        return parsed?.version === SCHEMA_VERSION ? parsed.state : null;
      } catch {
        return null;
      }
    },
    save(state) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => persist(state), 250);
    },
    async replaceAll(state) {
      persist(state);
    },
  };
}

function memoryAdapter(): Adapter {
  return { mode: "memory", onStatus: () => undefined, load: async () => null, save: () => undefined, replaceAll: async () => undefined };
}

function localStorageWorks(): boolean {
  try {
    const key = "__ctr_probe__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Prefer the artifact's db; fall back to this browser, then to memory. */
export async function pickAdapter(): Promise<Adapter> {
  const runtime = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (runtime?.use) {
    try {
      const db = (await runtime.use("db")) as Db | null;
      if (db) return cloudAdapter(db);
    } catch (error) {
      console.warn("[artifact] db unavailable", error);
    }
  }
  return localStorageWorks() ? localAdapter() : memoryAdapter();
}
