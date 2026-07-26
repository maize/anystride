import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { JsonLd } from "@/components/JsonLd";
import { SiteHeader } from "@/components/SiteHeader";
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

function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="flex items-baseline gap-1 font-semibold">
              <span className="tracking-tight">anystride</span>
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Free training plans, sourced from the running community.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link
              href="/plans"
              className="transition-colors duration-300 ease-stride hover:text-foreground"
            >
              Plans
            </Link>
            <Link
              href="/guides"
              className="transition-colors duration-300 ease-stride hover:text-foreground"
            >
              Guides
            </Link>
            <Link
              href="/coaching"
              className="transition-colors duration-300 ease-stride hover:text-foreground"
            >
              Coaching
            </Link>
            <Link
              href="/privacy"
              className="transition-colors duration-300 ease-stride hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition-colors duration-300 ease-stride hover:text-foreground"
            >
              Terms
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
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
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-foreground"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="content" className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
