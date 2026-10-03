import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your coaching account",
  description: "Manage your Anystride coaching application, services and requests.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-12">{children}</div>;
}
