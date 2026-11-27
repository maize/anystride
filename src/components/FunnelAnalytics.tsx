"use client";

import { useEffect } from "react";
import { trackProductEventOnce } from "@/lib/analytics";
import { useFormAbandon } from "@/lib/form-abandon";
import { majorCurrencyValue, type ItemCategory } from "@/lib/product-events";

export function StorefrontStart() {
  useEffect(() => { trackProductEventOnce("storefront-start", "coach_storefront_start"); }, []);
  return null;
}

export function CheckoutAnalytics({
  itemId,
  itemCategory,
  value,
  currency,
  canAbandon,
}: {
  itemId: string;
  itemCategory: ItemCategory;
  value: number;
  currency: string;
  canAbandon: boolean;
}) {
  useFormAbandon({
    event: "checkout_abandon",
    fields: [],
    active: canAbandon,
    payload: () => {
      try { if (sessionStorage.getItem(`anystride:checkout-started:${itemId}`)) return null; } catch { /* Storage is optional. */ }
      return { item_id: itemId, item_category: itemCategory, value, currency, step_name: "offer", step_number: 1 };
    },
  });
  useEffect(() => {
    trackProductEventOnce(`view:${itemId}`, "view_item", { item_id: itemId, item_category: itemCategory, value, currency });
  }, [itemId, itemCategory, value, currency]);
  return null;
}

export function PurchaseAnalytics({
  transactionId,
  itemId,
  itemCategory,
  valueCents,
  currency,
  status,
  mode,
  isBuyer,
}: {
  transactionId: string;
  itemId: string;
  itemCategory: string;
  valueCents: number;
  currency: string;
  status: string;
  mode: string;
  isBuyer: boolean;
}) {
  useEffect(() => {
    if (!isBuyer || mode !== "live" || (status !== "paid" && status !== "partially_refunded")) return;
    if (itemCategory !== "package" && itemCategory !== "consultation") return;
    const value = majorCurrencyValue(valueCents);
    if (value === null) return;
    trackProductEventOnce(`purchase:${transactionId}`, "purchase", {
      transaction_id: transactionId,
      item_id: itemId,
      item_category: itemCategory,
      value,
      currency,
    }, "local");
  }, [transactionId, itemId, itemCategory, valueCents, currency, status, mode, isBuyer]);
  return null;
}
