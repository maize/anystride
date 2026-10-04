import Link from "next/link";
import { accountActor } from "@/lib/account-data";
import { storefrontOrders } from "@/lib/storefront-payments";
import { AccountEmpty, AccountHeading, accountPrice, accountDate } from "@/components/AccountUI";

export default async function OrdersPage() {
  const orders = await storefrontOrders(await accountActor());
  const purchases = orders.filter((o) => o.is_buyer);
  const sales = orders.filter((o) => !o.is_buyer);
  return <><AccountHeading title="Purchases & sales">Your coaching purchases and the services clients buy from you.</AccountHeading>{[["My purchases",purchases],["My sales",sales]].map(([heading,items]) => <section key={heading as string} className="mb-12"><h2 className="mb-6 text-2xl font-semibold">{heading as string}</h2>{!(items as typeof orders).length ? <AccountEmpty title="No orders yet" href={heading === "My purchases" ? "/coaching" : "/account/storefront"} action={heading === "My purchases" ? "Find your coach" : "Open my storefront"}>Your orders and their payment status will appear here.</AccountEmpty> : <div className="divide-y divide-border">{(items as typeof orders).map((order) => <article key={order.id} className="flex flex-wrap items-start justify-between gap-4 py-6"><div><p className="text-sm text-muted-foreground">{order.snapshot.coachName} · {accountDate(order.created_at)}</p><Link href={`/account/orders/${order.id}`} className="action-link text-lg">{order.snapshot.title} ↗</Link><p className="text-sm capitalize text-muted-foreground">{order.mode === "test" ? "Test order · " : ""}{order.status.replaceAll("_"," ")}</p></div><p className="text-xl font-semibold tabular-nums">{accountPrice(order.amount,order.currency)}</p></article>)}</div>}</section>)}</>;
}
