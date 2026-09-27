#!/usr/bin/env python3
"""Apply reviewed writer-index additions from the 2026-09 assignment audit.

The update is idempotent: an existing writer/book/page range is not duplicated.
Ambiguous assignments whose PDF row conflicts with the handwritten crop are
intentionally excluded.
"""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
WRITERS_PATH = ROOT / "data" / "writers.json"


NEW_WRITERS = [
    ("성광제", "psalms", 103, 105, "시편 83~85편"),
    ("이덕자A", "psalms", 138, 142, "시편 108~112편"),
    ("라온", "matthew", 6, 7, "마태복음 3장"),
    ("이하율", "matthew", 82, 82, "마태복음 26장 1~16절"),
    ("최연우1", "matthew", 85, 86, "마태복음 26장 36~56절"),
    ("이세은", "mark", 18, 22, "마가복음 6장 1~29절"),
    ("김하언", "luke", 15, 20, "누가복음 5~6장"),
]


EXISTING_WRITER_ENTRIES = [
    ("한진이", "genesis", 76, 79, "창세기 33~34장"),
    ("김경혜", "joshua", 40, 43, "여호수아 17~18장"),
    ("김경혜", "psalms", 98, 102, "시편 79~82편"),
    ("김경혜", "psalms", 154, 158, "시편 119편 91~176절"),
    ("오샛별", "first-timothy", 5, 8, "디모데전서 5~6장"),
    ("오샛별", "revelation", 16, 17, "요한계시록 12장"),
]


def make_entry(book_id, start, end, assigned):
    return {
        "book_id": book_id,
        "page": start,
        "start_page": start,
        "end_page": end,
        "page_count": end - start + 1,
        "assigned": assigned,
        "needs_review": False,
        "review_reasons": [],
        "notes": ["2026-09 분배표 및 이름 크롭 대조 반영"],
    }


def add_entry(writer, book_id, start, end, assigned):
    for entry in writer.get("entries", []):
        if (
            entry.get("book_id") == book_id
            and int(entry.get("start_page", entry.get("page", -1))) == start
            and int(entry.get("end_page", entry.get("page", -1))) == end
        ):
            return False
    writer.setdefault("entries", []).append(make_entry(book_id, start, end, assigned))
    return True


def main():
    writers = json.loads(WRITERS_PATH.read_text(encoding="utf-8"))
    by_id = {writer["writer_id"]: writer for writer in writers}
    by_name = {}
    for writer in writers:
        by_name.setdefault(writer.get("name", ""), []).append(writer)

    changes = []

    # Preserve distinguishing IDs (A/B/C/D/numeric suffixes) as search aliases.
    for writer in writers:
        writer_id = writer.get("writer_id", "")
        name = writer.get("name", "")
        if writer_id and writer_id != name:
            aliases = writer.setdefault("aliases", [])
            if writer_id not in aliases:
                aliases.append(writer_id)
                changes.append(f"alias: {writer_id}")

    for writer_id, book_id, start, end, assigned in NEW_WRITERS:
        writer = by_id.get(writer_id)
        if writer is None:
            writer = {
                "writer_id": writer_id,
                "name": writer_id,
                "aliases": [writer_id],
                "entries": [],
            }
            writers.append(writer)
            by_id[writer_id] = writer
            by_name.setdefault(writer_id, []).append(writer)
            changes.append(f"writer: {writer_id}")
        if add_entry(writer, book_id, start, end, assigned):
            changes.append(f"entry: {writer_id} {book_id} {start}-{end}")

    for name, book_id, start, end, assigned in EXISTING_WRITER_ENTRIES:
        candidates = by_name.get(name, [])
        if len(candidates) != 1:
            raise RuntimeError(f"Expected one existing writer named {name}, found {len(candidates)}")
        if add_entry(candidates[0], book_id, start, end, assigned):
            changes.append(f"entry: {name} {book_id} {start}-{end}")

    WRITERS_PATH.write_text(
        json.dumps(writers, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Applied {len(changes)} changes to {WRITERS_PATH}")
    for change in changes:
        print(f"- {change}")


if __name__ == "__main__":
    main()
