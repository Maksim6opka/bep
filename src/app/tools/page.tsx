import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools",
  description: "Small utilities",
};

const tools = [
  {
    href: "/tools/gif",
    title: "GIF converter",
    description: "Convert PNG, JPEG, or MP4 to GIF.",
  },
];

export default function ToolsPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight">Tools</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        A place for small utilities. Easy to grow over time.
      </p>
      <ul className="mt-10 grid gap-4">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="block rounded-lg border border-zinc-200 bg-white px-5 py-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <h2 className="text-base font-medium">{tool.title}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{tool.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
