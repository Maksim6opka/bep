"use client";

import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "./render-markdown";
import { PdfPreview } from "./pdf-preview";

const EXAMPLE = '# Документ із ChatGPT\n\n## Форматування\n\n**Жирний**, *курсив*, ~~закреслений~~ та `inline code`. [Посилання](https://example.com).\n\n> Цитата з поясненням.\n\n- Перший пункт\n  - Вкладений пункт\n- Другий пункт\n\n1. Перший крок\n2. Другий крок\n\n- [x] Перевірити Markdown\n- [ ] Зберегти PDF\n\n| Елемент | Підтримка |\n| :--- | ---: |\n| Українська | Так |\n| Таблиці | Так |\n\n### Код\n\n```javascript\nconst greeting = "Привіт, світе!";\nconsole.log(greeting);\n```\n\n### Формули\n\nЕнергія: $E = mc^2$.\n\n\\[\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n\\]\n\n### Діаграма\n\n```mermaid\nflowchart LR\n  A[Markdown] --> B[Передогляд]\n  B --> C[PDF]\n```\n\n---\n\nПримітка до документа[^1].\n\n[^1]: Усе обробляється локально.\n';
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
  const [pdf, setPdf] = useState("");
  const [tab, setTab] = useState<"source" | "preview" | "pdf">("source");
  const [format, setFormat] = useState<"a4" | "letter">("a4");
  const [fontSize, setFontSize] = useState(14);
  const preview = useRef<HTMLDivElement>(null);
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
          if (!cancelled) { setHtml(""); setError("Не вдалося відобразити документ. Перевірте його вміст."); }
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
    if (!/\.(md|markdown|txt)$/i.test(file.name)) { setError("Виберіть файл .md, .markdown або .txt."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Максимальний розмір Markdown — 2 МБ."); return; }
    try {
      const text = await file.text();
      invalidate(true); setSource(text); setName(file.name); setImages({}); setTab("source");
    } catch { setError("Не вдалося прочитати файл."); }
  }

  async function loadImages(files: FileList | null) {
    if (!files?.length) return;
    try {
      const next: Record<string, string> = {};
      for (const file of Array.from(files)) {
        if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
          throw new Error("Зображення: PNG, JPEG, GIF або WebP, до 10 МБ кожне.");
        }
        next[file.name] = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Не вдалося прочитати зображення."));
          reader.readAsDataURL(file);
        });
      }
      invalidate(true); setImages(previous => ({ ...previous, ...next }));
    } catch (e) { setError(e instanceof Error ? e.message : "Помилка зображення."); }
  }

  async function convert() {
    if (!preview.current || rendering || working || !source.trim()) return;
    setWorking(true); setError("");
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
      if (documentNode.scrollHeight > 14000) throw new Error("Документ завеликий для PDF у браузері. Розділіть його на менші частини.");
      const { default: html2pdf } = await import("html2pdf.js");
      const options = {
        margin: 15, filename: name.replace(/\.[^.]+$/, "") + ".pdf",
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: false, logging: false },
        jsPDF: { unit: "mm", format, orientation: "portrait" as const },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "img", ".katex-display", ".md-diagram"] },
      };
      const blob: Blob = await html2pdf().set(options).from(documentNode).outputPdf("blob");
      if (mounted.current && revision.current === current) { setPdf(URL.createObjectURL(blob)); setTab("pdf"); }
    } catch (e) {
      if (mounted.current && revision.current === current) setError(e instanceof Error ? e.message : "Не вдалося створити PDF. Спробуйте менший документ.");
    } finally { container.remove(); if (mounted.current) setWorking(false); }
  }

  return <section className="mt-8 space-y-5">
    <div className="rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700"
      onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!working) void loadFile(e.dataTransfer.files[0]); }}>
      <label className="block text-sm font-medium" htmlFor="markdown-file">Відкрийте .md або перетягніть його сюди</label>
      <input id="markdown-file" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" disabled={working} className="mt-3 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-zinc-900" onChange={e => { void loadFile(e.target.files?.[0]); e.target.value = ""; }} />
      <p className="mt-3 text-xs text-zinc-500">Або вставте відповідь ChatGPT у редактор нижче. До 2 МБ.</p>
    </div>
    <div className="flex flex-wrap items-end gap-4">
      <label className="text-sm">Сторінка<select className="ml-2 rounded border bg-transparent p-2" value={format} disabled={working} onChange={e => { invalidate(); setFormat(e.target.value as "a4" | "letter"); }}><option value="a4">A4</option><option value="letter">Letter</option></select></label>
      <label className="text-sm">Шрифт<select className="ml-2 rounded border bg-transparent p-2" value={fontSize} disabled={working} onChange={e => { invalidate(); setFontSize(Number(e.target.value)); }}>{[12, 14, 16, 18].map(size => <option key={size} value={size}>{size} px</option>)}</select></label>
      <button className={button} disabled={working} onClick={() => { invalidate(true); setSource(EXAMPLE); setImages({}); setName("example.md"); setTab("source"); }}>Приклад</button>
      <button className={button + " bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"} disabled={working || rendering || !html || !source.trim()} onClick={() => void convert()}>{working ? "Створення PDF…" : "Створити PDF"}</button>
    </div>
    <details className="text-sm"><summary className="cursor-pointer">Зображення з пристрою ({Object.keys(images).length})</summary>
      <p className="my-2 text-zinc-500">Для ![опис](photo.png) додайте photo.png. Зовнішні URL не завантажуються. PNG, JPEG, GIF, WebP — до 10 МБ.</p>
      <input aria-label="Локальні зображення" type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" disabled={working} onChange={e => { void loadImages(e.target.files); e.target.value = ""; }} />
    </details>
    <div role="status" aria-live="polite" className="text-sm text-zinc-500">{working ? "Генеруємо PDF на вашому пристрої…" : rendering ? "Оновлення передогляду…" : `${name} · ${source.length.toLocaleString("uk-UA")} символів${pdf ? " · PDF готовий" : ""}`}</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {warnings.map(warning => <p key={warning} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>)}
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div role="tablist" aria-label="Передогляд документа" className="flex flex-wrap gap-1 border-b border-zinc-200 p-2 dark:border-zinc-800">
        {([['source', 'Markdown'], ['preview', 'Форматування'], ['pdf', 'Готовий PDF']] as const).map(([id, label]) => <button key={id} id={`tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`panel-${id}`} className={button + (tab === id ? " bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-white" : "")} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <div id="panel-source" role="tabpanel" aria-labelledby="tab-source" hidden={tab !== "source"}>
        <textarea aria-label="Вхідний Markdown" spellCheck={false} value={source} disabled={working} className="block min-h-[560px] w-full resize-y bg-transparent p-5 font-mono text-sm leading-relaxed outline-offset-[-3px]" onChange={e => { invalidate(true); setSource(e.target.value); }} />
      </div>
      <div id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" hidden={tab !== "preview"} className="max-h-[780px] overflow-auto bg-zinc-200 p-4">
        <div className="mx-auto w-fit bg-white p-6 shadow-sm"><div ref={preview} className="markdown-document" style={{ width: `${width}mm`, fontSize }} dangerouslySetInnerHTML={{ __html: html }} /></div>
      </div>
      <div id="panel-pdf" role="tabpanel" aria-labelledby="tab-pdf" hidden={tab !== "pdf"}>
        {pdf ? <><div className="flex flex-wrap gap-3 p-3"><a className={button} href={pdf} download={name.replace(/\.[^.]+$/, "") + ".pdf"}>Завантажити PDF</a><a className={button} href={pdf} target="_blank" rel="noopener noreferrer">Відкрити PDF</a></div><PdfPreview key={pdf} url={pdf} /></> : <p className="p-10 text-center text-sm text-zinc-500">Натисніть «Створити PDF», щоб переглянути вихідний файл. Після редагування PDF потрібно створити знову.</p>}
      </div>
    </div>
    <p className="text-xs leading-relaxed text-zinc-500">Заголовки, списки, цитати, таблиці, чеклісти, посилання, виноски, підсвічування коду, LaTeX ($…$, $$…$$, \(…\), \[…\]) та Mermaid. HTML відображається як текст. Інтерактивні картки й службові посилання ChatGPT не входять у Markdown. PDF зберігає оформлення як зображення — текст не виділяється; довгі документи потрібно ділити на частини.</p>
  </section>;
}
