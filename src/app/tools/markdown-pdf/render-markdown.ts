import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import taskLists from "markdown-it-task-lists";
import texmath from "markdown-it-texmath";
import katex from "katex";
import hljs from "highlight.js";
import DOMPurify from "dompurify";

// No raw HTML, remote images, inline CSS, or executable document content.
export async function renderMarkdown(source: string, images: Record<string, string>) {
  const warnings = new Set<string>();
  const diagrams: { id: string; source: string }[] = [];
  const md = new MarkdownIt({
    html: false, linkify: true, breaks: true,
    highlight(code, language) {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
      }
      return "";
    },
  }).use(footnote).use(taskLists).use(texmath, {
    engine: katex, delimiters: ["dollars", "brackets"],
    katexOptions: { throwOnError: false, trust: false, strict: "ignore", maxExpand: 1000 },
  });
  const fence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    if (tokens[index].info.trim() !== "mermaid") return fence(tokens, index, options, env, self);
    const id = `diagram-${crypto.randomUUID()}`;
    diagrams.push({ id, source: tokens[index].content });
    return `<div id="${id}" class="md-diagram"></div>`;
  };
  md.renderer.rules.image = (tokens, index) => {
    const token = tokens[index];
    const src = String(token.attrGet("src") || "");
    let decoded = src;
    try { decoded = decodeURIComponent(src); } catch { /* Preserve literal filename. */ }
    const local = images[decoded] || images[decoded.replace(/^\.\//, "")];
    const safeData = /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(src);
    const alt = md.utils.escapeHtml(token.content || src);
    if (!local && !safeData) {
      warnings.add("Remote or missing images have been replaced with captions. Attach local images with matching filenames.");
      return `<span class="md-missing-image">[Image: ${alt}]</span>`;
    }
    return `<img src="${local || src}" alt="${alt}">`;
  };
  const host = document.createElement("div");
  host.innerHTML = DOMPurify.sanitize(md.render(source), { ADD_TAGS: ["eq", "eqn"], ADD_ATTR: ["target"] });
  for (const link of host.querySelectorAll("a")) {
    link.setAttribute("rel", "noopener noreferrer");
    if (!link.getAttribute("href")?.startsWith("#")) link.setAttribute("target", "_blank");
  }
  if (diagrams.length) {
    const { default: mermaid } = await import("mermaid");
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default", look: "classic", htmlLabels: false, suppressErrorRendering: true, flowchart: { htmlLabels: false }, secure: ["securityLevel", "startOnLoad", "maxTextSize", "suppressErrorRendering", "themeCSS", "htmlLabels", "look"] });
    for (const diagram of diagrams) {
      const target = host.querySelector(`#${diagram.id}`)!;
      try {
        // Do not let Mermaid resolve image nodes or document-supplied CSS.
        if (/(?:https?:|\/\/|data:|url\s*\(|@import|\bimg\s*:|<|%%\s*\{|^---)/im.test(diagram.source)) {
          throw new Error("External diagram content is disabled");
        }
        const { svg } = await mermaid.render(`svg-${diagram.id}`, diagram.source);
        // Raster-safe self-contained SVG; no external resources or active links.
        const clean = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ["foreignObject", "image", "a", "script"] });
        const svgDocument = new DOMParser().parseFromString(clean, "image/svg+xml");
        const root = svgDocument.documentElement;
        const bounds = root.getAttribute("viewBox")?.split(/\s+/).map(Number);
        if (bounds?.length === 4 && bounds[2] > 0 && bounds[3] > 0) {
          root.setAttribute("width", String(bounds[2]));
          root.setAttribute("height", String(bounds[3]));
        }
        const img = document.createElement("img");
        img.alt = "Mermaid diagram";
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(root))}`;
        target.append(img);
      } catch {
        target.textContent = diagram.source;
        warnings.add("A Mermaid diagram with invalid syntax, HTML, external resources, or custom configuration is shown as code.");
      }
    }
  }
  return { html: host.innerHTML, warnings: [...warnings] };
}
