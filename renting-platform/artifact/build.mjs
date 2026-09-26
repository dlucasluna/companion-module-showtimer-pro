// Builds the published Claude Artifact: one self-contained HTML page running
// the real components, pricing engine and projections in the browser.
//
//   npm run build:artifact   → artifact/dist/index.html (+ seed-docs.json)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
import * as esbuild from "esbuild";
import postcss from "postcss";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(here, "src");
const dist = path.join(here, "dist");

const TITLE = "ChurchTech Rent";

/** Server-only modules swapped for browser implementations. */
const aliases = {
  "next/navigation": path.join(src, "shims/next-navigation.ts"),
  "next/link": path.join(src, "shims/next-link.tsx"),
  "next/image": path.join(src, "shims/next-image.tsx"),
};

const aliasPlugin = {
  name: "artifact-aliases",
  setup(build) {
    build.onResolve({ filter: /^(next\/(navigation|link|image))$/ }, (args) => ({ path: aliases[args.path] }));
    build.onResolve({ filter: /^@\/lib\/actions\// }, (args) => ({ path: path.join(src, "actions", `${args.path.slice("@/lib/actions/".length)}.ts`) }));
    // Types only in the browser; enum values are never imported at runtime.
    build.onResolve({ filter: /^@prisma\/client$/ }, () => ({ path: "prisma-client", namespace: "empty" }));
    build.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};", loader: "js" }));
    build.onResolve({ filter: /^(server-only|node:.*)$/ }, (args) => ({ errors: [{ text: `${args.path} imported from ${args.importer} (server-only code in the artifact bundle)` }] }));
  },
};

const shared = {
  bundle: true,
  absWorkingDir: root,
  tsconfig: path.join(root, "tsconfig.json"),
  plugins: [aliasPlugin],
  loader: { ".svg": "dataurl" },
  jsx: "automatic",
  logOverride: { "module-level-directive": "silent" },
  logLevel: "warning",
};

async function buildScript() {
  const result = await esbuild.build({
    ...shared,
    entryPoints: [path.join(src, "main.tsx")],
    format: "iife",
    platform: "browser",
    target: ["es2020", "safari15"],
    minify: true,
    legalComments: "none",
    define: { "process.env.NODE_ENV": '"production"' },
    write: false,
    metafile: true,
  });
  return { code: result.outputFiles[0].text, metafile: result.metafile };
}

async function buildCss() {
  const input = path.join(root, "app/globals.css");
  const css = await readFile(input, "utf8");
  const result = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(css, { from: input });
  return result.css;
}

/**
 * The artifact skeleton adds an unlayered reset (body font, size, colour).
 * Tailwind's base styles live in @layer, so the page shell is restated here unlayered.
 */
const SHELL_CSS = `
html{color-scheme:dark;background:#070709;-webkit-text-size-adjust:100%}
body{margin:0;min-height:100dvh;background-color:#070709;background-image:radial-gradient(1200px 600px at 12% -10%,rgb(10 132 255/.09),transparent 60%),radial-gradient(900px 500px at 100% 0%,rgb(255 255 255/.035),transparent 60%);background-attachment:fixed;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI Variable Text","Segoe UI",system-ui,Roboto,"Helvetica Neue",Arial,sans-serif;font-size:.9375rem;line-height:1.55;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
`.trim();

/** Documents for seeding the artifact's db (the page also seeds itself when empty). */
async function buildSeedDocs() {
  const out = path.join(dist, "seed-cli.mjs");
  await esbuild.build({
    ...shared,
    entryPoints: [path.join(src, "data/seed-docs.ts")],
    format: "esm",
    platform: "node",
    outfile: out,
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const { seedDocuments } = await import(`${pathToFileURL(out).href}?t=${Date.now()}`);
  return seedDocuments();
}

const escapeScript = (code) => code.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");

await mkdir(dist, { recursive: true });
const [{ code, metafile }, css, docs] = await Promise.all([buildScript(), buildCss(), buildSeedDocs()]);

const html = [
  `<title>${TITLE}</title>`,
  `<style>${SHELL_CSS}</style>`,
  `<style>${css}</style>`,
  `<div id="root"></div>`,
  `<script>${escapeScript(code)}</script>`,
  "",
].join("\n");

await writeFile(path.join(dist, "index.html"), html);
await writeFile(path.join(dist, "seed-docs.json"), JSON.stringify(docs));
await writeFile(path.join(dist, "meta.json"), JSON.stringify(metafile));

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`artifact/dist/index.html  ${kb(Buffer.byteLength(html))}  (js ${kb(code.length)}, css ${kb(css.length)})`);
console.log(`artifact/dist/seed-docs.json  ${docs.length} documents`);
