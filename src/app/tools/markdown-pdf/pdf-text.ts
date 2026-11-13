import type { jsPDF } from "jspdf";
import type { PageSlice } from "./pagination";

let fontData: Promise<string> | undefined;

export async function embedTextFont(pdf: jsPDF) {
  fontData ??= fetch("/fonts/NotoSans-Regular.ttf").then(async response => {
    if (!response.ok) throw new Error("Could not load the local PDF font.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  }).catch(error => { fontData = undefined; throw error; });
  pdf.addFileToVFS("NotoSans-Regular.ttf", await fontData);
  pdf.addFont("NotoSans-Regular.ttf", "DocumentText", "normal");
  pdf.setFont("DocumentText", "normal");
}

/** Use the original Unicode text, never OCR, for the selectable PDF layer. */
export function addDocumentText(pdf: jsPDF, element: HTMLElement, pages: PageSlice[], scaleX: number, scaleY: number) {
  const origin = element.getBoundingClientRect();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || !node.data.trim() || parent.closest(".katex-mathml, script, style")) continue;
    const style = getComputedStyle(parent);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const fontSize = parseFloat(style.fontSize);
    const preserveSpaces = style.whiteSpace.startsWith("pre");
    let run: { text: string; left: number; right: number; top: number; bottom: number } | undefined;
    const flush = () => {
      if (!run || !run.text.trim()) { run = undefined; return; }
      const relativeTop = run.top - origin.top;
      const page = pages.findIndex(p => relativeTop >= p.top && relativeTop < p.bottom);
      if (page < 0) { run = undefined; return; }
      pdf.setPage(page + 1);
      pdf.setFontSize(fontSize * scaleY * 72 / 25.4);
      const width = pdf.getTextWidth(run.text);
      if (width > 0) pdf.text(run.text,
        15 + (run.left - origin.left) * scaleX,
        15 + (relativeTop - pages[page].top + fontSize * 0.9) * scaleY,
        { renderingMode: "invisible", horizontalScale: (run.right - run.left) * scaleX / width },
      );
      run = undefined;
    };
    const append = (text: string, rect: DOMRect) => {
      if (!rect.width || !rect.height) return;
      if (!preserveSpaces) text = text.replace(/\s+/g, " ");
      if (run && Math.abs(run.top - rect.top) < 0.5 && Math.abs(run.bottom - rect.bottom) < 0.5) {
        run.text += text; run.right = Math.max(run.right, rect.right);
      } else {
        flush();
        run = { text, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }
    };
    // Measure words instead of characters; only wrapped words need finer ranges.
    for (const match of node.data.matchAll(/\S+|\s+/gu)) {
      const start = match.index;
      range.setStart(node, start); range.setEnd(node, start + match[0].length);
      const rects = Array.from(range.getClientRects()).filter(rect => rect.width && rect.height);
      if (rects.length === 1 && !match[0].includes("\n")) append(match[0], rects[0]);
      else {
        let offset = start;
        for (const character of match[0]) {
          range.setStart(node, offset); offset += character.length; range.setEnd(node, offset);
          const rect = Array.from(range.getClientRects()).find(r => r.width && r.height);
          if (rect && character !== "\n") append(character, rect);
          else if (preserveSpaces && character === "\n") flush();
        }
      }
    }
    flush();
  }
}
