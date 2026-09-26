import { createRoot } from "react-dom/client";
import { can } from "@/lib/auth/permissions";
import { App } from "./app";
import { pickAdapter } from "./data/persistence";
import { buildSeed } from "./data/seed";
import { attachAdapter, currentUser, useDemo } from "./data/store";
import { useRouterStore } from "./router";

async function boot() {
  const adapter = await pickAdapter();
  attachAdapter(adapter);
  let state;
  try {
    state = await adapter.load();
  } catch (error) {
    // Never reseed over data we failed to read: retry once, then report.
    console.warn("[artifact] load failed, retrying", error);
    await new Promise((r) => setTimeout(r, 800));
    state = await adapter.load();
  }
  const fresh = !state;
  state ??= buildSeed();
  useDemo.setState({ state, status: "ready" });
  useRouterStore.setState({ href: can(currentUser().role, "dashboard.view") ? "/dashboard" : "/assets" });
  // First visit: the demo data is usable right away and saved in the background.
  if (fresh) adapter.replaceAll(state).catch((error) => console.error("[artifact] seeding failed", error));
}

createRoot(document.getElementById("root")!).render(<App />);
boot().catch((error) => {
  console.error("[artifact] boot failed", error);
  useDemo.setState({ status: "error" });
});
