import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Header and Footer only on homepage, not in app

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weblet GPT",
  description: "Multi-agent assistants for research, planning, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="w-full bg-emerald-50 border-b border-emerald-200 text-xs sm:text-sm text-emerald-900 text-center px-3 py-2">
          <span className="font-semibold">
            Weblet GPT is currently 100% free.
          </span>{" "}
          All features are available with a free account—no payment required.
        </div>
        {children}
      </body>
    </html>
  );
}
