"use client";

import { useEffect, useRef, type FocusEvent } from "react";
import { trackProductEvent } from "./analytics";
import type { ProductEvent } from "./product-events";

/** Fire when a form was started and left before a successful submit. */
export function useFormAbandon({
  event,
  fields,
  active = false,
  payload,
}: {
  event: ProductEvent;
  fields: readonly string[];
  active?: boolean;
  payload: () => Record<string, unknown> | null;
}) {
  const payloadRef = useRef(payload);
  const fieldsRef = useRef(fields);
  useEffect(() => {
    payloadRef.current = payload;
    fieldsRef.current = fields;
  }, [payload, fields]);
  const started = useRef(false);
  const done = useRef(false);
  const lastField = useRef("");

  useEffect(() => {
    if (active) started.current = true;
  }, [active]);

  useEffect(() => {
    function abandon() {
      if (done.current || !started.current) return;
      const extra = payloadRef.current();
      if (!extra) return;
      done.current = true;
      trackProductEvent(event, { ...extra, ...(lastField.current ? { last_field: lastField.current } : {}) });
    }
    window.addEventListener("pagehide", abandon);
    return () => {
      window.removeEventListener("pagehide", abandon);
      abandon();
    };
  }, [event]);

  return {
    markSubmitted() { done.current = true; },
    restart() { done.current = false; started.current = false; lastField.current = ""; },
    noteStart(field = "") {
      if (field && fieldsRef.current.includes(field)) lastField.current = field;
      if (started.current) return false;
      started.current = true;
      return true;
    },
    onFocus(focusEvent: FocusEvent<HTMLElement>) {
      const name = focusEvent.target instanceof Element ? focusEvent.target.getAttribute("name") ?? "" : "";
      if (!name || !fieldsRef.current.includes(name)) return false;
      lastField.current = name;
      if (started.current) return false;
      started.current = true;
      return true;
    },
  };
}
