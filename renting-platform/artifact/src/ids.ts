/** Lowercase alphanumeric ids (valid db path segments). */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "c" + Date.now().toString(36) + Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

/** Unguessable token (144 bits) for share links. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
