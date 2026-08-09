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


def process_pdf(pdf_path: Path, book_id: str, args) -> None:
    book_pages_dir = args.assets_root / book_id
    
    if not args.only_json:
        total = convert_pdf_to_webp_pages(pdf_path, book_pages_dir, args.quality, args.dpi)
    
    pdfinfo_total = get_total_pages(pdf_path)
    
    if not args.only_json:
        if total != pdfinfo_total:
            raise RuntimeError(f"Mismatch in extracted pages ({total}) vs pdfinfo ({pdfinfo_total}).")
        
        cover_dir = pdf_path.parent
        cover_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(book_pages_dir / "0001.webp", cover_dir / f"{book_id}_cover.webp")
        gallery_dir = Path("assets/gallery")
        gallery_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(book_pages_dir / "0001.webp", gallery_dir / "g-001.webp")
        print(f"Extracted {pdfinfo_total} pages to {book_pages_dir}")

    if args.manifest_root:
        args.manifest_root.mkdir(parents=True, exist_ok=True)
        manifest = build_manifest(book_id, book_pages_dir, pdfinfo_total, args.page_window)
        manifest_path = args.manifest_root / f"{book_id}.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote manifest: {manifest_path}")

def process_notes(input_dir: Path, output_dir: Path, quality: int, dpi: int) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        import fitz
    except ImportError:
        print("PyMuPDF (fitz) is not installed. Please install it with 'pip install PyMuPDF'")
        return

    for file_path in input_dir.iterdir():
        if file_path.is_file():
            if file_path.suffix.lower() == ".pdf":
                print(f"Processing PDF: {file_path.name}")
                try:
                    doc = fitz.open(file_path)
                    total_pages = len(doc)
                    if total_pages == 0:
                        print(f"  No pages found in {file_path.name}")
                        continue
                        
                    for i in range(total_pages):
                        page = doc.load_page(i)
                        zoom = dpi / 72.0
                        mat = fitz.Matrix(zoom, zoom)
                        pix = page.get_pixmap(matrix=mat)
                        
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        webp_name = f"{file_path.stem}_{i+1:02d}.webp" if total_pages > 1 else f"{file_path.stem}.webp"
                        webp_path = output_dir / webp_name
                        img.save(webp_path, "WEBP", quality=quality, method=6)
                        print(f"  Saved {webp_name}")
                except Exception as e:
                    print(f"  Failed to process {file_path.name}: {e}")

            elif file_path.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                print(f"Processing Image: {file_path.name}")
                with Image.open(file_path) as img:
                    rgb = img.convert("RGB")
                    webp_path = output_dir / f"{file_path.stem}.webp"
                    rgb.save(webp_path, "WEBP", quality=quality, method=6)
                    print(f"  Saved {webp_path.name}")

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, type=Path, help="Path to PDF file or directory")
    parser.add_argument("--book-id", type=str, help="Required if processing a single file without a numbered prefix")
    parser.add_argument("--assets-root", type=Path, default=Path("C:\\Users\\user\\Desktop\\남서울평촌교회\\성경전시관_웹페이지\\이북\\이북_도비라"))
    parser.add_argument("--manifest-root", type=Path, default=Path("C:\\Users\\user\\Desktop\\남서울평촌교회\\성경전시관_웹페이지\\이북\\이북_도비라\\json"))
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--dpi", type=int, default=170)
    parser.add_argument("--page-window", type=int, default=3)
    parser.add_argument("--only-json", action="store_true", help="Only generate manifest JSON, skip image extraction")
    parser.add_argument("--mode", type=str, choices=["bible", "notes"], default="bible", help="Mode of operation")
    parser.add_argument("--output-dir", type=Path, help="Output directory for notes mode (defaults to input dir)")
    args = parser.parse_args()

    if not args.pdf.exists():
        raise FileNotFoundError(f"Input path not found: {args.pdf}")

    if args.mode == "notes":
        if not args.pdf.is_dir():
            parser.error("--pdf must be a directory for notes mode")
        out_dir = args.output_dir if args.output_dir else args.pdf
        process_notes(args.pdf, out_dir, args.quality, args.dpi)
        return

    if args.pdf.is_dir():
        import re
        for pdf_file in args.pdf.glob("*.pdf"):
            match = re.search(r'_(\d+)', pdf_file.stem)
            if match:
                order_num = int(match.group(1))
                if 1 <= order_num <= 66:
                    book_id = CANONICAL_BOOK_IDS[order_num - 1]
                    print(f"Processing {pdf_file.name} -> {book_id}...")
                    process_pdf(pdf_file, book_id, args)
                else:
                    print(f"Skipping {pdf_file.name}: index out of bounds")
    else:
        if not args.book_id:
            import re
            match = re.search(r'_(\d+)', args.pdf.stem)
            if match:
                order_num = int(match.group(1))
                if 1 <= order_num <= 66:
                    args.book_id = CANONICAL_BOOK_IDS[order_num - 1]
            if not args.book_id:
                parser.error("--book-id is required for single files unless the filename contains the order number (e.g., _01)")
        process_pdf(args.pdf, args.book_id, args)

if __name__ == "__main__":
    main()


