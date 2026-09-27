#!/usr/bin/env python3
"""Compare the original Azure OCR, a Tesseract rerun, and writers.json."""

import json
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
WRITERS = ROOT / "data" / "writers.json"
AZURE_FILES = [
    ROOT / "tools" / "writer_table" / "old_bible_ocr_raw.jsonl",
    ROOT / "tools" / "writer_table" / "new_bible_ocr_raw.jsonl",
]
TESSERACT_FILES = [
    ROOT / "data" / "ocr_tesseract_old.jsonl",
    ROOT / "data" / "ocr_tesseract_new.jsonl",
]
REPORT = ROOT / "data" / "writer_ocr_comparison_report.json"


def load_jsonl(paths):
    result = {}
    for path in paths:
        for line in path.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            result[(row["book_id"], int(row["page"]))] = row
    return result


def repair_tesseract_text(value):
    value = str(value or "")
    try:
        return value.encode("latin1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value


def hangul(value):
    return "".join(
        ch
        for ch in unicodedata.normalize("NFC", str(value or ""))
        if 0xAC00 <= ord(ch) <= 0xD7A3
    )


def clean_ocr(value):
    text = hangul(value)
    # Every crop contains the printed label "이름" before the handwritten name.
    return text[2:] if len(text) >= 2 else ""


def similarity(left, right):
    if not left or not right:
        return 0.0
    return SequenceMatcher(None, left, right).ratio()


def main():
    writers = json.loads(WRITERS.read_text(encoding="utf-8"))
    azure = load_jsonl(AZURE_FILES)
    tesseract = load_jsonl(TESSERACT_FILES)

    expected = defaultdict(list)
    for writer in writers:
        labels = list(dict.fromkeys([
            writer.get("name", ""),
            writer.get("writer_id", ""),
            *writer.get("aliases", []),
        ]))
        for entry in writer.get("entries", []):
            start = int(entry.get("start_page", entry["page"]))
            end = int(entry.get("end_page", entry["page"]))
            for page in range(start, end + 1):
                expected[(entry["book_id"], page)].append({
                    "writer_id": writer.get("writer_id", ""),
                    "labels": labels,
                })

    rows = []
    for key in sorted(set(azure) | set(tesseract)):
        azure_raw = azure.get(key, {}).get("name_raw", "")
        tess_raw_stored = tesseract.get(key, {}).get("name_raw", "")
        tess_raw = repair_tesseract_text(tess_raw_stored)
        azure_name = clean_ocr(azure_raw)
        tess_name = clean_ocr(tess_raw)
        candidates = expected.get(key, [])

        scored = []
        for candidate in candidates:
            labels = [hangul(label) for label in candidate["labels"]]
            scored.append({
                "writer_id": candidate["writer_id"],
                "azure_score": max((similarity(azure_name, label) for label in labels), default=0.0),
                "tesseract_score": max((similarity(tess_name, label) for label in labels), default=0.0),
            })
        best = max(scored, key=lambda row: max(row["azure_score"], row["tesseract_score"]), default=None)
        best_score = max(best["azure_score"], best["tesseract_score"]) if best else 0.0

        if best_score >= 0.8:
            status = "confirmed"
        elif best_score >= 0.5:
            status = "probable"
        else:
            status = "needs_review"

        rows.append({
            "book_id": key[0],
            "page": key[1],
            "expected_writer_ids": [c["writer_id"] for c in candidates],
            "azure_raw": azure_raw,
            "azure_name": azure_name,
            "tesseract_raw": tess_raw,
            "tesseract_name": tess_name,
            "best_expected": best,
            "status": status,
        })

    counts = defaultdict(int)
    for row in rows:
        counts[row["status"]] += 1

    report = {
        "summary": {
            "total": len(rows),
            "confirmed": counts["confirmed"],
            "probable": counts["probable"],
            "needs_review": counts["needs_review"],
        },
        "needs_review": [row for row in rows if row["status"] == "needs_review"],
        "probable": [row for row in rows if row["status"] == "probable"],
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    print(f"Wrote {REPORT}")


if __name__ == "__main__":
    main()
