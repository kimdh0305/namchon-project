#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

BOOKS = [
    ("genesis", "Genesis", "창세기", "old"),
    ("exodus", "Exodus", "출애굽기", "old"),
    ("leviticus", "Leviticus", "레위기", "old"),
    ("numbers", "Numbers", "민수기", "old"),
    ("deuteronomy", "Deuteronomy", "신명기", "old"),
    ("joshua", "Joshua", "여호수아", "old"),
    ("judges", "Judges", "사사기", "old"),
    ("ruth", "Ruth", "룻기", "old"),
    ("first-samuel", "1 Samuel", "사무엘상", "old"),
    ("second-samuel", "2 Samuel", "사무엘하", "old"),
    ("first-kings", "1 Kings", "열왕기상", "old"),
    ("second-kings", "2 Kings", "열왕기하", "old"),
    ("first-chronicles", "1 Chronicles", "역대상", "old"),
    ("second-chronicles", "2 Chronicles", "역대하", "old"),
    ("ezra", "Ezra", "에스라", "old"),
    ("nehemiah", "Nehemiah", "느헤미야", "old"),
    ("esther", "Esther", "에스더", "old"),
    ("job", "Job", "욥기", "old"),
    ("psalms", "Psalms", "시편", "old"),
    ("proverbs", "Proverbs", "잠언", "old"),
    ("ecclesiastes", "Ecclesiastes", "전도서", "old"),
    ("song-of-songs", "Song of Songs", "아가", "old"),
    ("isaiah", "Isaiah", "이사야", "old"),
    ("jeremiah", "Jeremiah", "예레미야", "old"),
    ("lamentations", "Lamentations", "예레미야애가", "old"),
    ("ezekiel", "Ezekiel", "에스겔", "old"),
    ("daniel", "Daniel", "다니엘", "old"),
    ("hosea", "Hosea", "호세아", "old"),
    ("joel", "Joel", "요엘", "old"),
    ("amos", "Amos", "아모스", "old"),
    ("obadiah", "Obadiah", "오바댜", "old"),
    ("jonah", "Jonah", "요나", "old"),
    ("micah", "Micah", "미가", "old"),
    ("nahum", "Nahum", "나훔", "old"),
    ("habakkuk", "Habakkuk", "하박국", "old"),
    ("zephaniah", "Zephaniah", "스바냐", "old"),
    ("haggai", "Haggai", "학개", "old"),
    ("zechariah", "Zechariah", "스가랴", "old"),
    ("malachi", "Malachi", "말라기", "old"),
    ("matthew", "Matthew", "마태복음", "new"),
    ("mark", "Mark", "마가복음", "new"),
    ("luke", "Luke", "누가복음", "new"),
    ("john", "John", "요한복음", "new"),
    ("acts", "Acts", "사도행전", "new"),
    ("romans", "Romans", "로마서", "new"),
    ("first-corinthians", "1 Corinthians", "고린도전서", "new"),
    ("second-corinthians", "2 Corinthians", "고린도후서", "new"),
    ("galatians", "Galatians", "갈라디아서", "new"),
    ("ephesians", "Ephesians", "에베소서", "new"),
    ("philippians", "Philippians", "빌립보서", "new"),
    ("colossians", "Colossians", "골로새서", "new"),
    ("first-thessalonians", "1 Thessalonians", "데살로니가전서", "new"),
    ("second-thessalonians", "2 Thessalonians", "데살로니가후서", "new"),
    ("first-timothy", "1 Timothy", "디모데전서", "new"),
    ("second-timothy", "2 Timothy", "디모데후서", "new"),
    ("titus", "Titus", "디도서", "new"),
    ("philemon", "Philemon", "빌레몬서", "new"),
    ("hebrews", "Hebrews", "히브리서", "new"),
    ("james", "James", "야고보서", "new"),
    ("first-peter", "1 Peter", "베드로전서", "new"),
    ("second-peter", "2 Peter", "베드로후서", "new"),
    ("first-john", "1 John", "요한일서", "new"),
    ("second-john", "2 John", "요한이서", "new"),
    ("third-john", "3 John", "요한삼서", "new"),
    ("jude", "Jude", "유다서", "new"),
    ("revelation", "Revelation", "요한계시록", "new"),
]


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-manifest", type=Path, default=Path("data/manifests/book-01.json"))
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--manifest-dir", type=Path, default=Path("data/manifests"))
    args = parser.parse_args()

    source = json.loads(args.source_manifest.read_text(encoding="utf-8"))

    args.manifest_dir.mkdir(parents=True, exist_ok=True)
    valid_ids = {book_id for (book_id, _en, _ko, _testament) in BOOKS}
    for stale_manifest in args.manifest_dir.glob("*.json"):
        if stale_manifest.stem not in valid_ids:
            stale_manifest.unlink()
    books = []
    old_ids = []
    new_ids = []
    writers = []

    for order, (book_id, title_en, title_ko, testament) in enumerate(BOOKS, start=1):
        books.append(
            {
                "book_id": book_id,
                "testament": testament,
                "order": order,
                "title_en": title_en,
                "title_ko": title_ko,
                "cover_image": "/assets/covers/book-01.webp",
                "manifest_path": f"/data/manifests/{book_id}.json",
            }
        )

        if testament == "old":
            old_ids.append(book_id)
        else:
            new_ids.append(book_id)

        manifest = {
            "book_id": book_id,
            "total_pages": source["total_pages"],
            "page_window": source.get("page_window", 3),
            "pages": [
                {
                    "page": p["page"],
                    "image": p["image"],
                    "width": p["width"],
                    "height": p["height"],
                }
                for p in source["pages"]
            ],
        }
        write_json(args.manifest_dir / f"{book_id}.json", manifest)

        writers.append(
            {
                "writer_id": f"sample-writer-{order:03d}",
                "name": f"Sample Writer {order:02d}",
                "entries": [{"book_id": book_id, "page": (order % 30) + 1, "line_hint": "center"}],
            }
        )

    writers.insert(
        0,
        {
            "writer_id": "kim-namchon-001",
            "name": "김남촌A",
            "entries": [
                {"book_id": "genesis", "page": 12, "line_hint": "center", "chapter": 12},
                {"book_id": "genesis", "page": 13, "line_hint": "center", "chapter": 13},
                {"book_id": "genesis", "page": 14, "line_hint": "center", "chapter": 14},
                {"book_id": "genesis", "page": 15, "line_hint": "center", "chapter": 15},
                {"book_id": "matthew", "page": 5, "line_hint": "center", "chapter": 5},
                {"book_id": "matthew", "page": 6, "line_hint": "center", "chapter": 6},
            ],
        },
    )

    writers.insert(
        1,
        {
            "writer_id": "kim-namchon-002",
            "name": "김남촌B",
            "entries": [
                {"book_id": "genesis", "page": 42, "line_hint": "center", "chapter": 42},
                {"book_id": "acts", "page": 8, "line_hint": "center", "chapter": 8},
            ],
        },
    )

    toc = {
        "sections": [
            {"id": "old-testament", "title": "Old Testament", "books": old_ids},
            {"id": "new-testament", "title": "New Testament", "books": new_ids},
        ]
    }

    write_json(args.data_dir / "books.json", books)
    write_json(args.data_dir / "toc.json", toc)
    write_json(args.data_dir / "writers.json", writers)

    print(f"Generated sample catalog: {len(books)} books")


if __name__ == "__main__":
    main()
