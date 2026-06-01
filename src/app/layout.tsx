import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://anystride.com"),
  title: {
    default: "AnyStride — Free running training plans for every distance",
    template: "%s · AnyStride",
  },
  description:
    "Free, community-sourced running training plans for any distance and any runner. Pick your goal and level, get a complete week-by-week plan. No login, no paywall.",
  openGraph: {
    title: "AnyStride — Free running training plans",
    description:
      "Free, community-sourced training plans for any distance and any runner.",
    url: "https://anystride.com",
    siteName: "AnyStride",
    type: "website",
  },
};

function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-baseline gap-1 font-semibold">
          <span className="text-lg tracking-tight">AnyStride</span>
          <span className="h-2 w-2 translate-y-[-1px] rounded-full bg-brand" />
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/plans" className="hover:text-brand">
            Browse
          </Link>
          <Link href="/compare" className="hover:text-brand">
            Compare
          </Link>
          <Link href="/calculator" className="hover:text-brand">
            Paces
          </Link>
          <Link href="/coaching" className="hover:text-brand">
            Coaching
          </Link>
          <Link
            href="/plans"
            className="rounded-full bg-brand px-4 py-1.5 font-medium text-brand-foreground hover:opacity-90"
          >
            Find your plan
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          AnyStride — free training plans, sourced from the running community.
        </p>
        <p>
          Always consult a doctor before starting a new training program.
        </p>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
