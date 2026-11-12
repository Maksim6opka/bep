# bep

## Markdown → PDF

Open `/tools/markdown-pdf` from Tools. Import a UTF-8 `.md` file or paste Markdown, inspect the source and formatted preview, then generate, preview, and download a PDF. A4 and Letter paper sizes and four text sizes are available.

All document processing happens in the browser. No upload API, CDN scripts, remote image fetching, or document persistence is used. Libraries and KaTeX fonts are bundled with the app. Attach local raster images using the filenames referenced in Markdown.

Supports headings, emphasis, nested lists, task lists, blockquotes, tables, links, footnotes, syntax-highlighted code, KaTeX math with dollar/bracket delimiters, and Mermaid diagrams. Raw HTML and diagrams containing external resources/configuration are shown as text. ChatGPT-specific interactive widgets are not part of Markdown.

PDF pages preserve the rendered appearance as raster images, so text is not selectable. Markdown imports are limited to 2 MB and local images to 10 MB each. Very long documents are rejected before canvas rendering to avoid blank exports; split them into smaller documents.

Development: `npm run dev`. If Turbopack fails to start its worker on Windows, use `node node_modules/next/dist/bin/next dev --webpack`. The corresponding build command is `node node_modules/next/dist/bin/next build --webpack`.
