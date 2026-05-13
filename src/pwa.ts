export function registerServiceWorker(onUpdate?: () => void): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (import.meta.env.MODE !== "production") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              onUpdate?.();
            }
          });
        });
      })
      .catch((err) => console.warn("SW registration failed:", err));
  });
}
