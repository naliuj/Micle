// Service worker registration only — kept out of app.js since it's an
// unrelated concern (offline/installability, not game logic). Shared by both
// index.html and training/index.html, so the path must be root-absolute —
// a relative "sw.js" would resolve to /training/sw.js (404) on that page.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No offline support if this fails (unsupported browser, blocked by
      // an extension, etc.) — the game works identically either way.
    });
  });
}
