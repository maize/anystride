/** Display state only. Protected routes still verify the account independently. */
export const accountSessionChanged = "anystride:account-session-changed";

export function subscribeAccountSession(onChange: (signedIn: boolean) => void) {
  let disposed = false;
  let pending: AbortController | null = null;

  function check(force = false) {
    if (disposed || document.visibilityState === "hidden" || (pending && !force)) return;
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    void fetch("/api/marketplace/auth", {
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return;
      const result: unknown = await response.json();
      if (!disposed && !controller.signal.aborted && pending === controller &&
          result && typeof result === "object" && "signedIn" in result && typeof result.signedIn === "boolean") {
        onChange(result.signedIn);
      }
    }).catch(() => { /* Keep the last known label during a temporary network failure. */ })
      .finally(() => {
        window.clearTimeout(timeout);
        if (pending === controller) pending = null;
      });
  }
  const refresh = () => check();
  const changed = () => check(true);
  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", refresh);
  window.addEventListener(accountSessionChanged, changed);
  document.addEventListener("visibilitychange", refresh);
  check();
  return () => {
    disposed = true;
    pending?.abort();
    window.removeEventListener("focus", refresh);
    window.removeEventListener("pageshow", refresh);
    window.removeEventListener(accountSessionChanged, changed);
    document.removeEventListener("visibilitychange", refresh);
  };
}
