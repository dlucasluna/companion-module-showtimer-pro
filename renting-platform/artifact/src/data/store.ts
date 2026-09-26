import { create } from "zustand";
import { newId } from "../ids";
import type { Adapter, Dirty, StorageMode } from "./persistence";
import type { ActivityRec, DemoState, UserRec } from "./types";

interface DemoStore {
  state: DemoState | null;
  status: "loading" | "seeding" | "ready" | "error";
  mode: StorageMode;
  pendingWrites: number;
  saveError: string | null;
  userEmail: string;
}

const USER_KEY = "ctr-artifact-user";

function rememberedUser(): string {
  try {
    return localStorage.getItem(USER_KEY) ?? "lucas@churchtech.pt";
  } catch {
    return "lucas@churchtech.pt";
  }
}

export const useDemo = create<DemoStore>(() => ({
  state: null,
  status: "loading",
  mode: "memory",
  pendingWrites: 0,
  saveError: null,
  userEmail: rememberedUser(),
}));

let adapter: Adapter | null = null;

export function attachAdapter(next: Adapter) {
  adapter = next;
  next.onStatus((pendingWrites, saveError) => useDemo.setState({ pendingWrites, saveError }));
  useDemo.setState({ mode: next.mode });
}

export function getAdapter(): Adapter | null {
  return adapter;
}

export function current(): DemoState {
  const state = useDemo.getState().state;
  if (!state) throw new Error("Dados ainda não carregados");
  return state;
}

/** Applies a new state and persists the touched documents. */
export function commit(next: DemoState, dirty: Dirty[]) {
  useDemo.setState({ state: next });
  adapter?.save(next, dirty);
}

export function logActivity(state: DemoState, summary: string): { state: DemoState; dirty: Dirty } {
  const entry: ActivityRec = { id: newId(), summary, createdAt: new Date().toISOString() };
  return { state: { ...state, activity: [entry, ...state.activity].slice(0, 60) }, dirty: { doc: "activity" } };
}

export function currentUser(): UserRec {
  const state = current();
  const email = useDemo.getState().userEmail;
  const users = Object.values(state.users);
  return users.find((u) => u.email === email) ?? users.find((u) => u.role === "ADMIN") ?? users[0]!;
}

export function setCurrentUser(email: string) {
  try {
    localStorage.setItem(USER_KEY, email);
  } catch {
    // per-viewer convenience only
  }
  useDemo.setState({ userEmail: email });
}

export function useDemoState(): DemoState {
  const state = useDemo((s) => s.state);
  if (!state) throw new Error("Dados ainda não carregados");
  return state;
}
