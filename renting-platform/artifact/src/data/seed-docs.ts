import { buildSeed } from "./seed";
import { COLLECTIONS } from "./types";

/** The demo data as db documents (same layout the page's cloud adapter reads). */
export function seedDocuments(): { path: string; data: Record<string, unknown> }[] {
  const state = buildSeed();
  const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  const docs = [
    { path: "settings/company", data: json(state.company) },
    { path: "settings/activity", data: json({ items: state.activity.slice(0, 60) }) },
  ];
  for (const name of COLLECTIONS) {
    for (const [id, record] of Object.entries(state[name])) docs.push({ path: `${name}/${id}`, data: json(record) });
  }
  // Written last: the page only trusts a database whose meta document exists.
  docs.push({ path: "settings/meta", data: { version: 1, seededAt: new Date().toISOString() } });
  return docs;
}
