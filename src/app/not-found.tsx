import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-24 sm:py-32">
      <p className="text-sm font-medium text-brand">404</p>
      <h1 className="text-hero-gradient mt-2 max-w-2xl text-5xl font-bold tracking-tighter sm:text-6xl">
        This route doesn&apos;t exist.
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Wrong turn on the course. The page you&apos;re looking for was moved,
        renamed, or never existed.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-brand px-6 py-2.5 text-base font-semibold text-brand-foreground transition-all duration-300 ease-stride hover:bg-brand/90 active:scale-[0.98]"
        >
          Back to the start line
        </Link>
        <Link
          href="/plans"
          className="rounded-full border border-border px-6 py-2.5 text-base font-semibold transition-all duration-300 ease-stride hover:border-brand active:scale-[0.98]"
        >
          Browse all plans
        </Link>
      </div>
      <div className="mt-16 border-t border-border pt-8">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Looking for one of these?
        </h2>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li>
            <Link href="/calculator" className="text-brand hover:underline">
              Pace calculator
            </Link>
          </li>
          <li>
            <Link href="/guides" className="text-brand hover:underline">
              Running guides
            </Link>
          </li>
          <li>
            <Link href="/races" className="text-brand hover:underline">
              Race calendar
            </Link>
          </li>
          <li>
            <Link href="/coaching" className="text-brand hover:underline">
              Find a coach
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
