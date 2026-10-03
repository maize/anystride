import { accountActor } from "@/lib/account-data";
import { MarketplaceError } from "@/lib/marketplace-config";
import { readSandboxWorkspace } from "@/lib/sandbox-workspace";
import { SandboxCoachingForm } from "@/components/SandboxCoachingForm";

export default async function WorkspacePage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const actor = await accountActor();
  let workspace;
  try { workspace = await readSandboxWorkspace(actor, requestId); }
  catch (error) {
    return <><h1 className="text-3xl font-semibold">Sandbox coaching workspace</h1><p role="alert" className="mt-4">{error instanceof MarketplaceError ? error.message : "We could not load this workspace. Try again shortly."}</p><a href="/account" className="mt-6 inline-block underline">Back to your account</a></>;
  }
  return <>
    <a href="/account/coaching" className="text-sm underline">← My coaching</a>
    <h1 className="mt-8 text-3xl font-semibold tracking-tight">{workspace.title}</h1>
    <p className="mt-4 text-muted-foreground">Sandbox workspace · Test payments only. No real coaching service has been purchased.</p>
    <p className="mt-3 text-sm text-muted-foreground">Only this coach and runner can read these messages. Use synthetic training details; do not share medical, payment or other sensitive information.</p>
    <section aria-labelledby="conversation-heading" className="my-10 space-y-6">
      <h2 id="conversation-heading" className="text-2xl font-semibold">Conversation</h2>
      {!workspace.messages.length && <p className="text-muted-foreground">No messages yet. Introduce your test running goal or share the first coaching check-in.</p>}
      {workspace.messages.map((item) => <article key={item.id} className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">{item.mine ? "You" : item.sender_role === "coach" ? "Coach" : "Runner"}</p>
        <p className="mt-2 whitespace-pre-wrap break-words">{item.body}</p>
      </article>)}
      <p className="text-sm text-muted-foreground">Showing the latest 100 messages. <a href={`/account/workspaces/${requestId}`} className="underline">Refresh conversation</a></p>
    </section>
    <SandboxCoachingForm requestId={requestId} action="message" />
  </>;
}
