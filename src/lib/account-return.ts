/** Only storefront checkout can supply an authentication return destination. */
export function checkoutReturnPath(value: unknown) {
  return typeof value === "string" && /^\/account\/checkout\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value) ? value : "/account";
}
export const checkoutReturnCookie = "anystride-checkout-return";

export function checkoutReturnFromCookie(header: string | null) {
  const value = header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${checkoutReturnCookie}=`))?.slice(checkoutReturnCookie.length + 1);
  try { return checkoutReturnPath(decodeURIComponent(value ?? "")); } catch { return "/account"; }
}
