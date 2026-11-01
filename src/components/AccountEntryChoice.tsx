import Link from "next/link";

export function AccountEntryChoice() {
  return <section className="mx-auto max-w-3xl">
    <p className="text-sm font-semibold text-brand">Your Anystride account</p>
    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance">What brings you here?</h1>
    <p className="mt-4 max-w-xl text-muted-foreground">Choose where to start. Sign up or sign in with the same email, and switch views whenever you need.</p>
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      <Link href="/account/sign-in?as=runner" className="group rounded-xl bg-muted p-6 transition-colors duration-200 ease-stride hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
        <h2 className="text-2xl font-semibold">I’m a runner <span aria-hidden="true">→</span></h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Follow your training, connect with your coach and review your coaching purchases.</p>
      </Link>
      <Link href="/coaching/apply" className="group rounded-xl bg-muted p-6 transition-colors duration-200 ease-stride hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
        <h2 className="text-2xl font-semibold">I’m a coach <span aria-hidden="true">→</span></h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Manage athletes, build plans and set up your coaching profile and services.</p>
      </Link>
    </div>
  </section>;
}
