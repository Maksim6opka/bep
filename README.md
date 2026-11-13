# bep

## Markdown → PDF

Open `/tools/markdown-pdf` from Tools. Import a UTF-8 `.md` file or paste Markdown, inspect the source and formatted preview, then generate, preview, and download a PDF. A4 and Letter paper sizes and four text sizes are available.

All document processing happens in the browser. No upload API, CDN scripts, remote image fetching, or document persistence is used. Libraries and KaTeX fonts are bundled with the app. Attach local raster images using the filenames referenced in Markdown.

Supports headings, emphasis, nested lists, task lists, blockquotes, tables, links, footnotes, syntax-highlighted code, KaTeX math with dollar/bracket delimiters, and Mermaid diagrams. Raw HTML and diagrams containing external resources/configuration are shown as text. ChatGPT-specific interactive widgets are not part of Markdown.

PDF pages preserve the rendered appearance and include a selectable, searchable Unicode text layer from the source document. The built-in preview also supports text selection and copying. Noto Sans is bundled locally under the SIL Open Font License (see public/fonts/OFL.txt). There are no application-imposed file size or document length limits. PDF pages are rendered individually to avoid creating a document-sized canvas. Available browser memory and device resources determine practical capacity.

Development: `npm run dev`. If Turbopack fails to start its worker on Windows, use `node node_modules/next/dist/bin/next dev --webpack`. The corresponding build command is `node node_modules/next/dist/bin/next build --webpack`.
