export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="relative min-h-svh">{children}</main>;
}
