#!/usr/bin/env python3
"""
Resize the mic photo masters into web assets and write the manifest.

Input:  a path to the folder of finished square photos (not in this repo —
        they live in the shared Drive folder, same as the source inventory
        that scripts/parse_inventory.py reads).
Output: images/mics/{id}-320.webp and {id}-800.webp, plus data/photos.js.

Usage:
    python3 scripts/build-photos.py "/path/to/Photos/Edited/Done"
    python3 scripts/build-photos.py "/path/to/Done" --force   # ignore mtimes

Why this exists: the masters are 2048x2048 PNGs, ~830 KB each and 72 MB for
the set. Shipping those would put 72 MB through the service worker's runtime
cache. At 320/800 WebP the same set is ~2 MB, a 97% reduction, which is small
enough to commit.

Why Python rather than a .mjs like the other build scripts: this needs an
image library, and the project deliberately has no package.json. Pillow is
already a dependency of scripts/parse_inventory.py's openpyxl toolchain.

Some mics deliberately share another's photo — see ALIASES. An alias wins
even when a master of its own is sitting in the source folder; that master is
reported and ignored, never encoded.

A file whose name doesn't match a mic id in data/mics.js is REPORTED AND
SKIPPED, never fuzzy-matched. Fuzzy matching is exactly what let two misnamed
files (akg-414, audiotechnica-m87r) sit unnoticed for weeks while the mics
they belonged to looked unphotographed.
"""
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: python3 -m pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "images" / "mics"
MANIFEST = ROOT / "data" / "photos.js"

# (suffix, pixel size, quality). 320 is the list thumbnail at 2x; 800 is the
# detail panel, which is never shown wider than ~400 CSS px.
SIZES = [("320", 320, 80), ("800", 800, 82)]

SOURCE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

# Mics whose photo is deliberately another mic's file. The B&K 4011 and 4007
# are the DPA ones — DPA was spun out of Brüel & Kjær's microphone division
# and the bodies are identical — so the pair is shot once and reused instead
# of photographed twice. The EV N/D408 is the N/D308's housing in the same
# clip; the two shots were indistinguishable once cropped square, so the 308
# frame serves both.
#
# An explicit map rather than a duplicated master in the source folder: a
# copy in the shared Drive is one re-download away from being renamed or
# dropped, and the alias would then vanish from the manifest with nothing to
# say it ever existed. Every pair here is also in quiz.js's CONFUSABLE_GROUPS,
# so a shared photo can never be offered against itself — add the group there
# before adding an alias here, or the quiz can ask a question whose photo
# matches two of its own options.
ALIASES = {
    "bk-4011": "dpa-4011",
    "bk-4007": "dpa-4007",
    "ev-nd408": "ev-nd308",
}


def mic_ids():
    """Every id in data/mics.js, in file order."""
    src = (ROOT / "data" / "mics.js").read_text()
    return re.findall(r'id: "([^"]+)"', src)


def encode(src_path, dst_path, size, quality):
    with Image.open(src_path) as im:
        im = im.convert("RGB")
        if im.width != im.height:
            print(f"    ! {src_path.name} is {im.width}x{im.height}, not square — "
                  f"centre-cropping to the shorter side")
            edge = min(im.size)
            left = (im.width - edge) // 2
            top = (im.height - edge) // 2
            im = im.crop((left, top, left + edge, top + edge))
        im = im.resize((size, size), Image.LANCZOS)
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst_path, "WEBP", quality=quality, method=6)
    return dst_path.stat().st_size


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    if not args:
        sys.exit(__doc__)
    source = Path(args[0]).expanduser()
    if not source.is_dir():
        sys.exit(f"Not a directory: {source}")

    ids = set(mic_ids())
    files = sorted(p for p in source.iterdir()
                   if p.suffix.lower() in SOURCE_EXTS and not p.name.startswith("."))

    manifest, unmatched, written, skipped, total_bytes = {}, [], 0, 0, 0
    sources = {}

    def emit(mic_id, path):
        """Write both sizes for one mic from one master, and record it."""
        nonlocal written, skipped, total_bytes
        for suffix, size, quality in SIZES:
            dst = OUT_DIR / f"{mic_id}-{suffix}.webp"
            if not force and dst.exists() and dst.stat().st_mtime >= path.stat().st_mtime:
                total_bytes += dst.stat().st_size
                skipped += 1
                continue
            total_bytes += encode(path, dst, size, quality)
            written += 1
        manifest[mic_id] = {"w": SIZES[-1][1], "h": SIZES[-1][1]}

    for path in files:
        mic_id = path.stem
        if mic_id not in ids:
            unmatched.append(path.name)
            continue
        if mic_id in ALIASES:
            # Encoding it would stamp a fresh mtime on the output, and the
            # alias pass below would then skip it as already up to date — so
            # the alias would silently never apply. Say so and move on.
            print(f"  ! {path.name} is aliased to {ALIASES[mic_id]} — master ignored")
            continue
        sources[mic_id] = path
        emit(mic_id, path)

    # Aliases run after the main pass so their source is guaranteed resolved
    # whatever order the folder listed it in.
    for alias_id, source_id in sorted(ALIASES.items()):
        if alias_id not in ids:
            print(f"  ! alias {alias_id} is not a mic id in data/mics.js — skipped")
            continue
        path = sources.get(source_id)
        if path is None:
            print(f"  ! alias {alias_id} wants {source_id}, which has no master here "
                  f"— skipped")
            continue
        emit(alias_id, path)
        print(f"  alias {alias_id} <- {path.name}")

    # The placeholder ships at detail size only. At a 40px thumbnail its
    # "Photo coming soon" caption is an illegible smudge, so the list draws a
    # CSS box instead — see .mic-thumb--empty in css/training.css.
    for theme in ("light", "dark"):
        src = Path.home() / "Downloads" / f"micle-photo-coming-soon-{theme}.png"
        dst = OUT_DIR / f"_placeholder-{theme}-800.webp"
        if src.exists() and (force or not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime):
            total_bytes += encode(src, dst, 800, 82)
            written += 1
            print(f"  placeholder ({theme}) -> {dst.name}")
        elif dst.exists():
            total_bytes += dst.stat().st_size

    header = (
        "// GENERATED by scripts/build-photos.py — do not edit by hand.\n"
        "//\n"
        "// Which mics have a photo, keyed by mic id. Files live at\n"
        "//   /images/mics/{id}-320.webp   list thumbnail\n"
        "//   /images/mics/{id}-800.webp   detail panel\n"
        "//\n"
        "// Mics are listed EXPLICITLY rather than probed for by filename: with\n"
        "// part of the pool still unphotographed, probing would mean one 404 per\n"
        "// photo-less mic on every render of the Reference tab. A mic absent from\n"
        "// this object renders the placeholder and makes no request.\n"
        "//\n"
        "// w/h are the detail image's intrinsic pixels, set on the <img> so the\n"
        "// layout reserves the right space before the photo loads.\n"
    )
    body = ",\n".join(f'  "{k}": {{ w: {v["w"]}, h: {v["h"]} }}'
                      for k, v in sorted(manifest.items()))
    MANIFEST.write_text(
        f"{header}const MIC_PHOTOS = {{\n{body},\n}};\n"
        'if (typeof module !== "undefined") module.exports = { MIC_PHOTOS };\n'
    )

    missing = sorted(ids - set(manifest))
    print(f"\n  photos: {len(manifest)} of {len(ids)} mics "
          f"({100 * len(manifest) / len(ids):.0f}%)")
    print(f"  encoded {written} file(s), reused {skipped}, "
          f"images/mics total {total_bytes / 1024 / 1024:.1f} MB")
    print(f"  wrote {MANIFEST.relative_to(ROOT)}")

    if unmatched:
        print(f"\n  !! {len(unmatched)} file(s) match no mic id and were SKIPPED:")
        for n in unmatched:
            print(f"       {n}")
        print("     Rename them to {mic-id}.{ext} and re-run.")
    if missing:
        print(f"\n  {len(missing)} mic(s) still have no photo:")
        for i in missing:
            print(f"       {i}")


if __name__ == "__main__":
    main()
