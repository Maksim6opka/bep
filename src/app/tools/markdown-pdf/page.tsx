import type { Metadata } from "next";
import { MarkdownConverter } from "./markdown-converter";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";
import "./markdown.css";

export const metadata: Metadata = {
  title: "Markdown → PDF",
  description: "Convert Markdown to PDF entirely in your browser, with previews, math, code, and tables.",
};

export default function MarkdownPdfPage() {
  return <div>
    <h1 className="text-2xl font-medium tracking-tight">Markdown → PDF</h1>
    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Your files stay on your device. Editing, previews, and PDF generation run entirely in your browser.</p>
    <MarkdownConverter />
  </div>;
}
