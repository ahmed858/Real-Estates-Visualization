import Link from "next/link";

// Landing page: links to the demo project until client projects get their own links (Phase 7).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Unit Explorer</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Interactive floor plan visualization for real estate projects.
      </p>
      <Link href="/p/demo-villa" className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
        Open the demo villa
      </Link>
    </main>
  );
}
