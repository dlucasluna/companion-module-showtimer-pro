import { toCanvas } from "html-to-image";

/**
 * "Baixar PDF" inside the artifact: window.print() is blocked in the frame, so
 * each A4 sheet of the proposal document is rendered to an image, sliced into
 * A4 pages and written into a minimal PDF, then offered through the
 * platform's `downloads` capability.
 */

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const SHEET_WIDTH_PX = 794; // 210 mm at 96 dpi
const MM_PX = 96 / 25.4;
const encoder = new TextEncoder();

interface PdfPage {
  jpeg: Uint8Array;
  width: number;
  height: number;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.split(",")[1] ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Minimal PDF 1.4 writer: one full-page JPEG per page. */
export function buildPdf(pages: PdfPage[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: () => void) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body();
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%âãÏÓ\n");
  const pageIds = pages.map((_, i) => 3 + i * 3);
  object(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () => push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`));
  pages.forEach((page, i) => {
    const pageId = 3 + i * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    object(pageId, () =>
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT} ${A4_HEIGHT_PT}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
    object(imageId, () => {
      push(
        `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
      );
      push(page.jpeg);
      push("\nendstream");
    });
    const draw = `q ${A4_WIDTH_PT} 0 0 ${A4_HEIGHT_PT} 0 0 cm /Im0 Do Q`;
    object(contentId, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
  });

  const xrefOffset = length;
  const count = 3 + pages.length * 3;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id += 1) push(`${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    out.set(chunk, position);
    position += chunk.length;
  }
  return out;
}

/** Blocks a page break must not cut through (a line item, a paragraph, a heading). */
const UNBREAKABLE = "section, li, tr, p, h1, h2, h3, dl, img";

/** Moves `cut` up to the top of any block it would slice (never above half a page). */
function safeCut(cut: number, start: number, pageHeight: number, blocks: [number, number][]): number {
  let next = cut;
  for (let changed = true; changed; ) {
    changed = false;
    for (const [top, bottom] of blocks) {
      if (top < next && bottom > next && top > start + pageHeight * 0.5) {
        next = top;
        changed = true;
      }
    }
  }
  return next;
}

/**
 * Renders every `.doc-sheet` in `root` and slices tall sheets into A4 pages.
 * Sheets are rendered from an offscreen copy at A4 width, so the layout (and the
 * measured break points) is the same on a phone as on a desktop.
 */
export async function renderDocumentPages(root: HTMLElement): Promise<PdfPage[]> {
  const sheets = Array.from(root.querySelectorAll<HTMLElement>(".doc-sheet"));
  const pages: PdfPage[] = [];
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${SHEET_WIDTH_PX}px;pointer-events:none;`;
  document.body.appendChild(host);
  try {
    for (const sheet of sheets) {
      const clone = sheet.cloneNode(true) as HTMLElement;
      Object.assign(clone.style, { width: `${SHEET_WIDTH_PX}px`, maxWidth: `${SHEET_WIDTH_PX}px`, margin: "0", borderRadius: "0", boxShadow: "none" });
      host.replaceChildren(clone);
      const origin = clone.getBoundingClientRect().top;
      const measured = Array.from(clone.querySelectorAll(UNBREAKABLE)).map((el) => {
        const rect = el.getBoundingClientRect();
        return [rect.top - origin, rect.bottom - origin] as [number, number];
      });

      const canvas = await toCanvas(clone, { pixelRatio: 2, backgroundColor: "#ffffff", skipFonts: true });
      const scale = canvas.width / clone.offsetWidth;
      const blocks = measured.map(([top, bottom]) => [top * scale, bottom * scale] as [number, number]);
      const pageHeight = Math.round((canvas.width * A4_HEIGHT_PT) / A4_WIDTH_PT);

      for (let y = 0; y < canvas.height; ) {
        const remaining = canvas.height - y;
        if (y > 0 && remaining < pageHeight * 0.04) break; // rounding overflow, not real content
        // Continuation pages get a top margin (the sheet's own padding is only on its first page).
        const offset = y > 0 ? Math.round(12 * MM_PX * scale) : 0;
        const room = pageHeight - offset;
        const end = remaining > room ? safeCut(y + room, y, room, blocks) : canvas.height;
        const height = end - y;
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = pageHeight;
        const ctx = slice.getContext("2d");
        if (!ctx) throw new Error("Canvas indisponível");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, y, canvas.width, height, 0, offset, canvas.width, height);
        pages.push({ jpeg: dataUrlToBytes(slice.toDataURL("image/jpeg", 0.9)), width: slice.width, height: slice.height });
        y = end;
      }
    }
  } finally {
    host.remove();
  }
  return pages;
}

interface Downloads {
  save(request: { filename: string; data: Blob }): Promise<{ status: string }>;
}

export async function downloadsAvailable(): Promise<Downloads | null> {
  const runtime = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
  if (!runtime?.use) return null;
  try {
    return (await runtime.use("downloads")) as Downloads | null;
  } catch {
    return null;
  }
}

export type PdfResult = "saved" | "declined" | "unavailable" | "failed";

export async function exportProposalPdf(root: HTMLElement, filename: string): Promise<PdfResult> {
  const downloads = await downloadsAvailable();
  if (!downloads) return "unavailable";
  let bytes: Uint8Array;
  try {
    bytes = buildPdf(await renderDocumentPages(root));
  } catch (error) {
    console.error("[artifact] pdf render failed", error);
    return "failed";
  }
  try {
    await downloads.save({ filename, data: new Blob([bytes as BlobPart], { type: "application/pdf" }) });
    return "saved";
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "declined") return "declined";
    console.error("[artifact] pdf save failed", error);
    return code === "unavailable" || code === "not_granted" ? "unavailable" : "failed";
  }
}
