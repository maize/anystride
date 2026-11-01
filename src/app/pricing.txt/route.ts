import { pricingText } from "@/lib/public-product";
export function GET() {
  return new Response(pricingText(), { headers: { "Content-Type": "text/plain; charset=utf-8", "Link": '<https://anystride.com/pricing>; rel="canonical"' } });
}
