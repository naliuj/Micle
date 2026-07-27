// Service worker registration only — kept out of app.js since it's an
// unrelated concern (offline/installability, not game logic).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // No offline support if this fails (unsupported browser, blocked by
      // an extension, etc.) — the game works identically either way.
    });
  });
}
