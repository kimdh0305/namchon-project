#!/usr/bin/env python3
import argparse
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image


R2_PAGES_BASE_URL = "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/books"

CANONICAL_BOOK_IDS = [
    "genesis",
    "exodus",
    "leviticus",
    "numbers",
    "deuteronomy",
    "joshua",
    "judges",
    "ruth",
    "first-samuel",
    "second-samuel",
    "first-kings",
    "second-kings",
    "first-chronicles",
    "second-chronicles",
    "ezra",
    "nehemiah",
    "esther",
    "job",
    "psalms",
    "proverbs",
    "ecclesiastes",
    "song-of-songs",
    "isaiah",
    "jeremiah",
    "lamentations",
    "ezekiel",
    "daniel",
    "hosea",
    "joel",
    "amos",
    "obadiah",
    "jonah",
    "micah",
    "nahum",
    "habakkuk",
    "zephaniah",
    "haggai",
    "zechariah",
    "malachi",
    "matthew",
    "mark",
    "luke",
    "john",
    "acts",
    "romans",
    "first-corinthians",
    "second-corinthians",
    "galatians",
    "ephesians",
    "philippians",
    "colossians",
    "first-thessalonians",
    "second-thessalonians",
    "first-timothy",
    "second-timothy",
    "titus",
    "philemon",
    "hebrews",
    "james",
    "first-peter",
    "second-peter",
    "first-john",
    "second-john",
    "third-john",
    "jude",
    "revelation",
]

BOOK_ID_TO_ORDER = {book_id: index for index, book_id in enumerate(CANONICAL_BOOK_IDS, start=1)}


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def get_total_pages(pdf_path: Path) -> int:
    out = subprocess.check_output(["pdfinfo", str(pdf_path)], text=True)
    for line in out.splitlines():
        if line.startswith("Pages:"):
            return int(line.split(":", 1)[1].strip())
    raise RuntimeError("Could not parse page count from pdfinfo output.")


def convert_pdf_to_webp_pages(pdf_path: Path, output_dir: Path, quality: int, dpi: int) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    tmp_png_dir = output_dir / ".tmp_png"
    if tmp_png_dir.exists():
        shutil.rmtree(tmp_png_dir)
    tmp_png_dir.mkdir(parents=True, exist_ok=True)

    prefix = str(tmp_png_dir / "page")
    run(["pdftoppm", "-r", str(dpi), "-png", str(pdf_path), prefix])

    png_files = sorted(tmp_png_dir.glob("page-*.png"))
    if not png_files:
        raise RuntimeError("No pages extracted from PDF.")

    for i, png in enumerate(png_files, start=1):
        with Image.open(png) as img:
            rgb = img.convert("RGB")
            webp_path = output_dir / f"{i:04d}.webp"
            rgb.save(webp_path, "WEBP", quality=quality, method=6)

    shutil.rmtree(tmp_png_dir)
    return len(png_files)


def build_page_image_url(book_id: str, page: int) -> str:
    order = BOOK_ID_TO_ORDER.get(book_id)
    if order is None:
        raise ValueError(f"Unknown canonical book_id: {book_id}")
    return f"{R2_PAGES_BASE_URL}/book-{order:02d}/{page:04d}.webp"


def build_manifest(book_id: str, output_dir: Path, total_pages: int, page_window: int) -> dict:
    pages = []
    for page in range(1, total_pages + 1):
        img_path = output_dir / f"{page:04d}.webp"
        with Image.open(img_path) as img:
            width, height = img.size
        pages.append(
            {
                "page": page,
                "image": build_page_image_url(book_id, page),
                "width": width,
                "height": height,
            }
        )
    return {
        "book_id": book_id,
        "total_pages": total_pages,
        "page_window": page_window,
        "pages": pages,
    }


def rewrite_manifest_page_urls(manifest: dict) -> dict:
    book_id = manifest.get("book_id", "")
    pages = []
    for page_info in manifest.get("pages", []):
        page_number = int(page_info["page"])
        pages.append(
            {
                **page_info,
                "image": build_page_image_url(book_id, page_number),
            }
        )
    return {
        **manifest,
        "pages": pages,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--book-id", required=True)
    parser.add_argument("--assets-root", type=Path, default=Path("assets/pages"))
    parser.add_argument("--manifest-root", type=Path, default=Path("data/manifests"))
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--dpi", type=int, default=170)
    parser.add_argument("--page-window", type=int, default=3)
    args = parser.parse_args()

    if not args.pdf.exists():
        raise FileNotFoundError(f"PDF not found: {args.pdf}")

    book_pages_dir = args.assets_root / args.book_id
    total = convert_pdf_to_webp_pages(args.pdf, book_pages_dir, args.quality, args.dpi)

    # Sanity-check total pages with pdfinfo output.
    pdfinfo_total = get_total_pages(args.pdf)
    if total != pdfinfo_total:
        raise RuntimeError(f"Mismatch in extracted pages ({total}) vs pdfinfo ({pdfinfo_total}).")

    cover_dir = Path("assets/covers")
    cover_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(book_pages_dir / "0001.webp", cover_dir / f"{args.book_id}.webp")
    gallery_dir = Path("assets/gallery")
    gallery_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(book_pages_dir / "0001.webp", gallery_dir / "g-001.webp")

    args.manifest_root.mkdir(parents=True, exist_ok=True)
    manifest = build_manifest(args.book_id, book_pages_dir, total, args.page_window)
    manifest_path = args.manifest_root / f"{args.book_id}.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Extracted {total} pages to {book_pages_dir}")
    print(f"Wrote manifest: {manifest_path}")


if __name__ == "__main__":
    main()

