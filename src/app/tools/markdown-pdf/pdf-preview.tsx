"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export function PdfPreview({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

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
    if (!document) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    void (async () => {
      try {
        const current = await document.getPage(page);
        if (cancelled || !canvas.current) return;
        const viewport = current.getViewport({ scale: 1.5 });
        const target = canvas.current;
        target.parentElement?.scrollTo(0, 0);
        target.width = viewport.width;
        target.height = viewport.height;
        task = current.render({ canvas: target, viewport });
        await task.promise;
      } catch (e) {
        if (!cancelled && !(e instanceof Error && e.name === "RenderingCancelledException")) setError("Could not render this PDF page.");
      } finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [document, page]);

  function changePage(next: number) { setBusy(true); setPage(next); }
  return <div className="bg-zinc-200 p-4 text-zinc-900">
    <div className="mb-4 flex items-center justify-center gap-4 text-sm">
      <button className="rounded border border-zinc-400 px-3 py-1 disabled:opacity-40" disabled={!document || page <= 1 || busy} onClick={() => changePage(page - 1)}>Previous</button>
      <span aria-live="polite">{document ? `Page ${page} of ${document.numPages}` : "Opening PDF…"}</span>
      <button className="rounded border border-zinc-400 px-3 py-1 disabled:opacity-40" disabled={!document || page >= document.numPages || busy} onClick={() => changePage(page + 1)}>Next</button>
    </div>
    {error && <p role="alert" className="mb-3 text-sm text-red-800">{error}</p>}
    <div aria-busy={busy}>
      <canvas ref={canvas} aria-label={`PDF preview, page ${page}`} className="mx-auto h-auto max-w-full bg-white shadow-sm" />
    </div>
  </div>;
}
