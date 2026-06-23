import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { JsonLd } from "@/components/JsonLd";
import "./globals.css";

// GA4 Measurement ID. Public by nature (it ships in the page), so it's safe to
// commit as the default; an env var can still override it per-environment.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-QHBHKRHCZJ";

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
    default: "anystride — Free running training plans for every distance",
    template: "%s · anystride",
  },
  description:
    "Free, community-sourced running training plans for any distance and any runner. Pick your goal and level, get a complete week-by-week plan. No login, no paywall.",
  openGraph: {
    title: "anystride — Free running training plans",
    description:
      "Free, community-sourced training plans for any distance and any runner.",
    url: "https://anystride.com",
    siteName: "anystride",
    type: "website",
  },
};

function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-baseline gap-1 font-semibold">
          <span className="text-lg tracking-tight">anystride</span>
          <span className="h-2 w-2 translate-y-[-1px] rounded-full bg-brand" />
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/plans" className="hover:text-brand">
            Browse
          </Link>
          <Link href="/compare" className="hover:text-brand">
            Compare
          </Link>
          <Link href="/guides" className="hover:text-brand">
            Guides
          </Link>
          <Link href="/races" className="hover:text-brand">
            Races
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
          anystride — free training plans, sourced from the running community.
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
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "anystride",
            url: "https://anystride.com",
            description:
              "Free, community-sourced running training plans for any distance and any runner.",
            publisher: {
              "@type": "Organization",
              name: "anystride",
              url: "https://anystride.com",
            },
          }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
