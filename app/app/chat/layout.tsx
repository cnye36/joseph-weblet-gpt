export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 overflow-hidden">{children}</main>
  );
}
