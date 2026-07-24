#!/usr/bin/env python3
"""
Parse the studio equipment inventory spreadsheet and extract candidate
microphone name strings.

Input:  a path to the source .xlsx (not checked into this repo)
Output: scripts/raw_candidates.json — a staging artifact for manual curation.
        This script does not decide what's a "real" mic; a human curates
        data/mics.js from this output.

Usage:
    python3 scripts/parse_inventory.py "/path/to/inventory.xlsx"
"""
import sys
import json
import re
from pathlib import Path

import openpyxl

QUANTITY_SUFFIX = re.compile(r"\s*\(\d+\)\s*$")

# Sheets confirmed (by manual inspection) to have a mic column, and which
# column index (0-based) that column lives in, plus the row range to read
# (inclusive, 1-based) so we don't spill into unrelated sections that share
# the same sheet (cables, adapters, IRPM bundles, etc).
SHEET_MIC_RANGES = {
    "136-B10 (Studio Ops Floating Ge": [
        # "Microphones" column (col B / index 1), rows 5-30 (before "Cables" header)
        {"col": 1, "min_row": 5, "max_row": 30},
        # IRPM Bundle #1 (col B) and #2 (col D), mic-only lines within the bundle
        # (stop before the Jensen DI Box / headphones lines that follow each list)
        {"col": 1, "min_row": 56, "max_row": 62},
        {"col": 3, "min_row": 56, "max_row": 60},
    ],
    "136-B01 (Studio A)": [{"col": 2, "min_row": 4, "max_row": 42}],
    "136-B06": [{"col": 2, "min_row": 4, "max_row": 8}],
    "136-B04": [{"col": 2, "min_row": 4, "max_row": 4}],
    "136-B09 (Studio E)": [{"col": 2, "min_row": 2, "max_row": 39}],
    "136-B14 (Studio B)": [{"col": 2, "min_row": 2, "max_row": 39}],
    "160-A144 (Studio 1)": [{"col": 2, "min_row": 2, "max_row": 41}],
    "160-A132 (Studio 2)": [{"col": 2, "min_row": 2, "max_row": 41}],
    "160-B242 (Dub Stage)": [{"col": 2, "min_row": 2, "max_row": 19}],
    "160-B247 (Studio 3)": [{"col": 2, "min_row": 2, "max_row": 31}],
}

HEADER_STRINGS = {
    "Microphones", "Microphone/Direct Box", "Direct Boxes",
}


def clean(raw: str) -> str:
    s = raw.strip()
    s = QUANTITY_SUFFIX.sub("", s)
    return s.strip()


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    src = Path(sys.argv[1])
    wb = openpyxl.load_workbook(src, data_only=True)

    out = []
    seen = set()
    for sheet_name, ranges in SHEET_MIC_RANGES.items():
        ws = wb[sheet_name]
        for rng in ranges:
            col = rng["col"]
            for row_idx in range(rng["min_row"], rng["max_row"] + 1):
                cell = ws.cell(row=row_idx, column=col + 1)
                v = cell.value
                if v is None:
                    continue
                v = str(v).strip()
                if not v or v in HEADER_STRINGS:
                    continue
                name = clean(v)
                key = (name.lower(), sheet_name)
                if key in seen:
                    continue
                seen.add(key)
                out.append({"raw": name, "sheet": sheet_name})

    out_path = Path(__file__).parent / "raw_candidates.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"Wrote {len(out)} candidate rows to {out_path}")


if __name__ == "__main__":
    main()
