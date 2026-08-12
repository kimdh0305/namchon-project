#!/usr/bin/env python3
"""
PDF 추출 및 변환 스크립트 (extract_pdf_pages.py)

사용법 (Arguments):
  --pdf             [필수] 변환할 PDF 파일 경로 또는 디렉토리 경로
  --book-id         [선택] 단일 파일을 변환할 때 파일명에 번호 접두사(예: _66)가 없는 경우 필수 입력 (예: genesis, revelation)
  --assets-root     [선택] WebP 이미지가 저장될 기본 디렉토리 경로
                    (기본값: C:\\Users\\user\\Desktop\\남서울평촌교회\\성경전시관_웹페이지\\이북\\이북_도비라)
  --manifest-root   [선택] JSON 매니페스트 파일이 저장될 디렉토리 경로
                    (기본값: C:\\Users\\user\\Desktop\\남서울평촌교회\\성경전시관_웹페이지\\이북\\이북_도비라\\json)
  --quality         [선택] 변환될 WebP 이미지의 품질 (기본값: 82)
  --dpi             [선택] 추출할 이미지의 해상도 DPI (기본값: 170)
  --page-window     [선택] JSON 매니페스트에 포함될 페이지 윈도우 크기 (기본값: 3)
  --only-json       [선택] 이미지 추출 과정을 건너뛰고 JSON 매니페스트만 생성하는 플래그
  --mode            [선택] 실행 모드. "bible"(기본) 또는 "notes" 선택 가능
  --output-dir      [선택] "notes" 모드일 때 사용할 출력 디렉토리 (기본값은 입력 디렉토리와 동일)

실행 예시:
  python tools/ingest/extract_pdf_pages.py --pdf "C:\path\to\file_66.pdf"
"""
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
    import fitz
    doc = fitz.open(pdf_path)
    return len(doc)


def convert_pdf_to_webp_pages(pdf_path: Path, output_dir: Path, quality: int, dpi: int) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    import fitz
    from PIL import Image
    
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    for i in range(total_pages):
        page = doc.load_page(i)
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        webp_path = output_dir / f"{(i+1):04d}.webp"
        img.save(webp_path, "WEBP", quality=quality, method=6)
        
    return total_pages


def build_page_image_url(book_id: str, page: int) -> str:
    order = BOOK_ID_TO_ORDER.get(book_id)
    if order is None:
        return f"{R2_PAGES_BASE_URL}/{book_id}/{page:04d}.webp"
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
                args.book_id = args.pdf.stem
        process_pdf(args.pdf, args.book_id, args)

if __name__ == "__main__":
    main()


