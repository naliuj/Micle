// A shared photo lightbox, used by Study Mode (Reference detail panel, quiz)
// and the daily game's end-of-round reveal. Lives in its own file rather than
// being duplicated into js/app.js and js/training.js, the same way
// js/compare.js and js/storage.js are shared — there's no module system here,
// so a plain script in the page's load order is the available mechanism.
//
// Both pages must carry the dialog markup, and it MUST sit outside any
// element that can be hidden. A <dialog> nested inside a `hidden` section
// still inherits that section's display:none even though showModal() promotes
// it to the top layer, so it opens at 0x0 and looks broken. In
// training/index.html that meant moving it out of #reference-tab.

let lightboxEls = null;

function bindLightbox() {
  const dialog = document.getElementById("photo-lightbox");
  // The daily game and Study Mode both include it, but guard anyway so this
  // file is harmless on a page that doesn't.
  if (!dialog) return;

  lightboxEls = {
    dialog,
    img: document.getElementById("photo-lightbox-img"),
    caption: document.getElementById("photo-lightbox-caption"),
    close: document.getElementById("photo-lightbox-close"),
  };

  lightboxEls.close.addEventListener("click", closeLightbox);
  dialog.addEventListener("click", (e) => {
    // Backdrop click. The <img> and caption sit inside, so a click landing on
    // the dialog element itself can only be the area around them.
    if (e.target === dialog) closeLightbox();
  });
}

// `caption` is optional on purpose. The Reference panel and the end-of-round
// reveal name the mic; the quiz must not, because the name is the answer to
// the question still on screen.
function openLightbox(src, alt, caption) {
  if (!lightboxEls) return;
  lightboxEls.img.src = src;
  lightboxEls.img.alt = alt;
  lightboxEls.caption.textContent = caption || "";
  lightboxEls.caption.hidden = !caption;
  lightboxEls.dialog.showModal();
}

// Clearing the src frees the decoded bitmap once the dialog is shut. It is
// done ONLY here, never from a "close" event: at least one engine fires a
// spurious close while showModal() is still opening the dialog, which
// stripped the image a tick after it was set and left an open lightbox
// showing a broken-image icon. openLightbox sets the src before showing, so
// there is no stale frame to guard against anyway.
function closeLightbox() {
  if (!lightboxEls) return;
  lightboxEls.dialog.close();
  lightboxEls.img.removeAttribute("src");
}

// Wraps an <img> in a button so the enlargement is reachable by keyboard and
// announced, rather than being a click target only a mouse can find.
//
// `fullSrc` is for callers whose on-page image is a thumbnail: the daily
// game's reveal card uses the 320px file to stay light, and without this the
// lightbox would just scale that up and look soft. Defaults to the image's
// own src, which is what the Reference panel and the quiz want — theirs are
// already the 800px version.
function makeZoomable(img, label, caption, fullSrc) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "photo-zoom";
  btn.setAttribute("aria-label", label);
  img.replaceWith(btn);
  btn.appendChild(img);
  btn.addEventListener("click", () => openLightbox(fullSrc || img.src, img.alt, caption));
  return btn;
}

if (typeof module !== "undefined") {
  module.exports = { bindLightbox, openLightbox, closeLightbox, makeZoomable };
}
