import Link from "next/link";

export default function ToolsLayout({ children }: LayoutProps<"/tools">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <nav className="mx-auto flex max-w-3xl items-center gap-6 text-sm">
          <Link href="/" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
            Home
          </Link>
          <Link href="/tools" className="font-medium text-zinc-900 dark:text-zinc-100">
            Tools
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">{children}</main>
    </div>
  );
}
