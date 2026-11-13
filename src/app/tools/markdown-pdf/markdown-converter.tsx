"use client";

import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "./render-markdown";
import { PdfPreview } from "./pdf-preview";

const EXAMPLE = '# ChatGPT document\n\n## Formatting\n\n**Bold**, *italic*, ~~strikethrough~~ and `inline code`. [Link](https://example.com).\n\n> A quote with an explanation.\n\n- First item\n  - Nested item\n- Second item\n\n1. First step\n2. Second step\n\n- [x] Review Markdown\n- [ ] Save PDF\n\n| Feature | Support |\n| :--- | ---: |\n| Unicode | Yes |\n| Tables | Yes |\n\n### Code\n\n```javascript\nconst greeting = "Hello, world!";\nconsole.log(greeting);\n```\n\n### Math\n\nEnergy: $E = mc^2$.\n\n\\[\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n\\]\n\n### Diagram\n\n```mermaid\nflowchart LR\n  A[Markdown] --> B[Preview]\n  B --> C[PDF]\n```\n\n---\n\nA document footnote[^1].\n\n[^1]: Everything is processed locally.\n';
const button = "rounded-lg border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";
let renderQueue = Promise.resolve();

export function MarkdownConverter() {
  const [source, setSource] = useState(EXAMPLE);
  const [name, setName] = useState("document.md");
  const [images, setImages] = useState<Record<string, string>>({});
  const [html, setHtml] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState("");
  const [pdf, setPdf] = useState("");
  const [tab, setTab] = useState<"source" | "preview" | "pdf">("source");
  const [format, setFormat] = useState<"a4" | "letter">("a4");
  const [fontSize, setFontSize] = useState(14);
  const preview = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const mounted = useRef(true);
  const width = format === "a4" ? 180 : 185.9;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf); }, [pdf]);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      renderQueue = renderQueue.then(async () => {
        if (cancelled) return;
        try {
          const result = await renderMarkdown(source, images);
          if (!cancelled) { setHtml(result.html); setWarnings(result.warnings); }
        } catch {
          if (!cancelled) { setHtml(""); setError("Could not render the document. Please check its contents."); }
        } finally { if (!cancelled) setRendering(false); }
      });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [source, images]);

  function invalidate(needsRender = false) {
    revision.current++;
    setPdf(""); setError("");
    if (needsRender) setRendering(true);
  }

  async function loadFile(file?: File) {
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) { setError("Choose a .md, .markdown, or .txt file."); return; }
    try {
      const text = await file.text();
      invalidate(true); setSource(text); setName(file.name); setImages({}); setTab("source");
    } catch { setError("Could not read the file."); }
  }

  async function loadImages(files: FileList | null) {
    if (!files?.length) return;
    try {
      const next: Record<string, string> = {};
      for (const file of Array.from(files)) {
        if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
          throw new Error("Choose PNG, JPEG, GIF, or WebP images.");
        }
        next[file.name] = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read the image."));
          reader.readAsDataURL(file);
        });
      }
      invalidate(true); setImages(previous => ({ ...previous, ...next }));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the image."); }
  }

  async function convert() {
    if (!preview.current || rendering || working || !source.trim()) return;
    setWorking(true); setError(""); setProgress("Preparing document…");
    const current = revision.current;
    // Export the same markup at the physical paper width, independent of viewport.
    const container = document.createElement("div");
    container.className = "md-export-host";
    const documentNode = preview.current.cloneNode(true) as HTMLDivElement;
    documentNode.style.width = `${width}mm`;
    container.append(documentNode);
    document.body.append(container);
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(documentNode.querySelectorAll("img"), img => img.decode()));
      const { exportPdf } = await import("./export-pdf");
      const blob = await exportPdf(documentNode, format, (page, total) => {
        if (mounted.current) setProgress(`Rendering page ${page} of ${total}…`);
      });
      if (mounted.current && revision.current === current) { setPdf(URL.createObjectURL(blob)); setTab("pdf"); }
    } catch (e) {
      if (mounted.current && revision.current === current) setError(e instanceof Error ? e.message : "Could not create the PDF. Please try again.");
    } finally { container.remove(); if (mounted.current) setWorking(false); }
  }

  return <section className="mt-8 space-y-5">
    <div className="rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700"
      onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!working) void loadFile(e.dataTransfer.files[0]); }}>
      <label className="block text-sm font-medium" htmlFor="markdown-file">Open a .md file or drop it here</label>
      <input ref={fileInput} id="markdown-file" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" disabled={working} hidden onChange={e => { void loadFile(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" className={button} disabled={working} onClick={() => fileInput.current?.click()}>Choose file</button><span className="break-all text-sm text-zinc-500">{name}</span></div>
      <p className="mt-3 text-xs text-zinc-500">Or paste a ChatGPT response into the editor below. No file size limit.</p>
    </div>
    <div className="flex flex-wrap items-end gap-4">
      <label className="text-sm">Page<select className="ml-2 rounded border bg-transparent p-2" value={format} disabled={working} onChange={e => { invalidate(); setFormat(e.target.value as "a4" | "letter"); }}><option value="a4">A4</option><option value="letter">Letter</option></select></label>
      <label className="text-sm">Font size<select className="ml-2 rounded border bg-transparent p-2" value={fontSize} disabled={working} onChange={e => { invalidate(); setFontSize(Number(e.target.value)); }}>{[12, 14, 16, 18].map(size => <option key={size} value={size}>{size} px</option>)}</select></label>
      <button className={button} disabled={working} onClick={() => { invalidate(true); setSource(EXAMPLE); setImages({}); setName("example.md"); setTab("source"); }}>Example</button>
      <button className={button + " bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"} disabled={working || rendering || !html || !source.trim()} onClick={() => void convert()}>{working ? "Creating PDF…" : "Create PDF"}</button>
    </div>
    <details className="text-sm"><summary className="cursor-pointer">Images from your device ({Object.keys(images).length})</summary>
      <p className="my-2 text-zinc-500">For ![description](photo.png), attach photo.png. Remote URLs are not loaded. Supports PNG, JPEG, GIF, and WebP.</p>
      <input ref={imageInput} aria-label="Local images" type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" disabled={working} hidden onChange={e => { void loadImages(e.target.files); e.target.value = ""; }} />
      <button type="button" className={button} disabled={working} onClick={() => imageInput.current?.click()}>Add images</button>
    </details>
    <div role="status" aria-live="polite" className="text-sm text-zinc-500">{working ? progress : rendering ? "Updating preview…" : `${name} · ${source.length.toLocaleString("en-US")} characters${pdf ? " · PDF ready" : ""}`}</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {warnings.map(warning => <p key={warning} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>)}
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div role="tablist" aria-label="Document preview" className="flex flex-wrap gap-1 border-b border-zinc-200 p-2 dark:border-zinc-800">
        {([['source', 'Markdown'], ['preview', 'Formatting'], ['pdf', 'PDF preview']] as const).map(([id, label]) => <button key={id} id={`tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`panel-${id}`} className={button + (tab === id ? " bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-white" : "")} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <div id="panel-source" role="tabpanel" aria-labelledby="tab-source" hidden={tab !== "source"}>
        <textarea aria-label="Markdown source" spellCheck={false} value={source} disabled={working} className="block min-h-[560px] w-full resize-y bg-transparent p-5 font-mono text-sm leading-relaxed outline-offset-[-3px]" onChange={e => { invalidate(true); setSource(e.target.value); }} />
      </div>
      <div id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" hidden={tab !== "preview"} className="max-h-[780px] overflow-auto bg-zinc-200 p-4">
        <div className="mx-auto w-fit bg-white p-6 shadow-sm"><div ref={preview} className="markdown-document" style={{ width: `${width}mm`, fontSize }} dangerouslySetInnerHTML={{ __html: html }} /></div>
      </div>
      <div id="panel-pdf" role="tabpanel" aria-labelledby="tab-pdf" hidden={tab !== "pdf"}>
        {pdf ? <><div className="flex flex-wrap gap-3 p-3"><a className={button} href={pdf} download={name.replace(/\.[^.]+$/, "") + ".pdf"}>Download PDF</a><a className={button} href={pdf} target="_blank" rel="noopener noreferrer">Open PDF</a></div><PdfPreview key={pdf} url={pdf} /></> : <p className="p-10 text-center text-sm text-zinc-500">Click “Create PDF” to preview the output file. After editing, generate the PDF again.</p>}
      </div>
    </div>
    <p className="text-xs leading-relaxed text-zinc-500">Headings, lists, blockquotes, tables, task lists, links, footnotes, syntax highlighting, LaTeX, and Mermaid. HTML is displayed as text. ChatGPT interactive cards and internal references are not part of Markdown. PDF text can be selected, copied, and searched.</p>
  </section>;
}
