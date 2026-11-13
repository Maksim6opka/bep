"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask, TextLayer } from "pdfjs-dist";

export function PdfPreview({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pageContainer = useRef<HTMLDivElement>(null);
  const textContainer = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!pageContainer.current) return;
    const observer = new ResizeObserver(([entry]) => setPageWidth(Math.floor(entry.contentRect.width)));
    observer.observe(pageContainer.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loading: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        if (cancelled) return;
        loading = pdfjs.getDocument({ url });
        const pdf = await loading.promise;
        if (!cancelled) setDocument(pdf);
      } catch {
        if (!cancelled) { setError("Could not open the preview. You can still download the PDF."); setBusy(false); }
      }
    })();
    return () => { cancelled = true; void loading?.destroy(); };
  }, [url]);

  useEffect(() => {
    if (!document || !pageWidth) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    let textLayer: TextLayer | undefined;
    void (async () => {
      try {
        const current = await document.getPage(page);
        if (cancelled || !canvas.current || !textContainer.current) return;
        const viewport = current.getViewport({ scale: pageWidth / current.getViewport({ scale: 1 }).width });
        const target = canvas.current;
        target.parentElement?.scrollTo(0, 0);
        target.width = Math.ceil(viewport.width * 2);
        target.height = Math.ceil(viewport.height * 2);
        target.style.width = `${viewport.width}px`;
        target.style.height = `${viewport.height}px`;
        textContainer.current.replaceChildren();
        textContainer.current.style.setProperty("--total-scale-factor", String(viewport.scale));
        task = current.render({ canvas: target, viewport, transform: [2, 0, 0, 2, 0, 0] });
        await task.promise;
        const { TextLayer } = await import("pdfjs-dist");
        if (cancelled) return;
        textLayer = new TextLayer({
          textContentSource: current.streamTextContent(), container: textContainer.current, viewport,
        });
        await textLayer.render();
      } catch (e) {
        if (!cancelled && !(e instanceof Error && e.name === "RenderingCancelledException")) setError("Could not render this PDF page.");
      } finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; task?.cancel(); textLayer?.cancel(); };
  }, [document, page, pageWidth]);

  function changePage(next: number) { setBusy(true); setPage(next); }
  return <div className="bg-zinc-200 p-4 text-zinc-900">
    <div className="mb-4 flex items-center justify-center gap-4 text-sm">
      <button className="rounded border border-zinc-400 px-3 py-1 disabled:opacity-40" disabled={!document || page <= 1 || busy} onClick={() => changePage(page - 1)}>Previous</button>
      <span aria-live="polite">{document ? `Page ${page} of ${document.numPages}` : "Opening PDF…"}</span>
      <button className="rounded border border-zinc-400 px-3 py-1 disabled:opacity-40" disabled={!document || page >= document.numPages || busy} onClick={() => changePage(page + 1)}>Next</button>
    </div>
    {error && <p role="alert" className="mb-3 text-sm text-red-800">{error}</p>}
    <div ref={pageContainer} aria-busy={busy} className="relative mx-auto bg-white shadow-sm">
      <canvas ref={canvas} aria-label={`PDF preview, page ${page}`} className="block" />
      <div ref={textContainer} className="pdf-text-layer" aria-label={`Selectable text, page ${page}`} />
    </div>
  </div>;
}
