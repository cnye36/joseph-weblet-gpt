import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-svh">
      {children}
      <Link
        href="/app"
        className="fixed left-4 bottom-4 text-xs underline px-2 py-1 rounded border bg-background"
      >
        Back to App
      </Link>
    </main>
  );
}


