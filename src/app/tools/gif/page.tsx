import type { Metadata } from "next";
import { GifConverter } from "./gif-converter";

export const metadata: Metadata = {
  title: "GIF converter",
  description: "Convert PNG, JPEG, and MP4 to GIF",
};

export default function GifToolPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight">GIF converter</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Upload a PNG, JPEG, or MP4 — conversion runs in the browser.
      </p>
      <GifConverter />
    </div>
  );
}
