import { redirect } from "next/navigation";
import { checkoutReturnPath } from "@/lib/account-return";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const query = await searchParams;
  const next = checkoutReturnPath(query.next);
  const params = new URLSearchParams();
  if (["runner", "athlete", "coach"].includes(query.as ?? "")) params.set("as", query.as === "athlete" ? "runner" : query.as!);
  if (next !== "/account") params.set("next", next);
  redirect(`/account/sign-in${params.size ? `?${params}` : ""}`);
}
