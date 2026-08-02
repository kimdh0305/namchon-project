import os
import re
import json
import shutil
import sys

# Ensure pymupdf and pillow are installed
try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: PyMuPDF is not installed. Please run: pip install pymupdf")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is not installed. Please run: pip install pillow")
    sys.exit(1)

# Configurations
INPUT_DIR = r"C:\Users\user\Desktop\남서울평촌교회\성경전시관_웹페이지\이북\이북_도비라"
BOOKS_JSON_PATH = "./data/books.json"
PAGES_OUTPUT_DIR = "./assets/pages"
MANIFESTS_DIR = "./data/manifests"
DEFAULT_ZOOM = 2.5  # Scales the page by 2x for high resolution (144 DPI)
WEBP_QUALITY = 90   # Quality for WebP compression (0-100)
COPY_PDF_TO_DEST = False  # Set to True if you want to keep the original PDF in the assets folder

def normalize(text):
    if not text:
        return ""
    text = text.lower()
    # Remove parenthesized details e.g., 창세기(Genesis) -> 창세기
    text = re.sub(r'\([^)]*\)', '', text)
    text = re.sub(r'\[[^\]]*\]', '', text)
    # Remove whitespace, hyphens, underscores, dots
    text = re.sub(r'[\s_\-\.]', '', text)
    return text

def find_matching_book(filename, books):
    base_name, _ = os.path.splitext(filename)
    norm_base = normalize(base_name)
    
    # 1. Match using "구약/신약 성경순서 성경책명" structure
    # Patterns like: "구약 01 창세기", "신약 01 마태복음"
    match = re.search(r'(구약|신약)\s*(\d+)\s*(.*)', base_name)
    if match:
        testament_type = match.group(1)
        num = int(match.group(2))
        rest = normalize(match.group(3))
        
        # Calculate target order
        # 구약 N: order = N (1 to 39)
        # 신약 N: order = 39 + N (40 to 66)
        if testament_type == '구약':
            target_order = num
        else:
            target_order = 39 + num
            
        # Find the book with this exact order
        for book in books:
            if book['order'] == target_order:
                # Double check with title matching to be safe
                norm_ko = normalize(book['title_ko'])
                norm_en = normalize(book['title_en'])
                norm_id = normalize(book['book_id'])
                if norm_ko in rest or norm_en in rest or norm_id in rest or rest in norm_ko:
                    return book
                # Return even if name matches loosely as order is highly specific
                return book

    # 2. Exact match after normalization (as fallback)
    for book in books:
        if (norm_base == normalize(book['title_ko']) or 
            norm_base == normalize(book['title_en']) or 
            norm_base == normalize(book['book_id'])):
            return book
            
    # 3. Substring match (as fallback)
    # Sort books by Korean title length descending to match longer titles first (e.g. "열왕기상" before "열왕기")
    sorted_books = sorted(books, key=lambda x: len(normalize(x['title_ko'])), reverse=True)
    for book in sorted_books:
        norm_ko = normalize(book['title_ko'])
        norm_en = normalize(book['title_en'])
        norm_id = normalize(book['book_id'])
        
        if ((norm_ko and norm_ko in norm_base) or 
            (norm_en and norm_en in norm_base) or 
            (norm_id and norm_id in norm_base)):
            return book
            
    return None

def process_pdf(pdf_path, book):
    order = book['order']
    book_id = book['book_id']
    title_ko = book['title_ko']
    
    # 1. Create output folder (e.g., assets/pages/book-01)
    book_folder_name = f"book-{order:02d}"
    output_folder = os.path.join(PAGES_OUTPUT_DIR, book_folder_name)
    os.makedirs(output_folder, exist_ok=True)
    
    # 2. Copy the PDF file to the destination folder (optional)
    if COPY_PDF_TO_DEST:
        dest_pdf_path = os.path.join(output_folder, os.path.basename(pdf_path))
        shutil.copy2(pdf_path, dest_pdf_path)
        print(f"  -> PDF copied to: {dest_pdf_path}")
    else:
        print("  -> Skipping PDF copying (COPY_PDF_TO_DEST is False).")
    
    # 3. Open PDF and extract pages
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"  -> Opened PDF: {total_pages} pages found.")
    
    pages_meta = []
    
    # Render matrix for high quality
    mat = fitz.Matrix(DEFAULT_ZOOM, DEFAULT_ZOOM)
    
    for page_idx in range(total_pages):
        page_num = page_idx + 1
        page = doc.load_page(page_idx)
        
        # Render page to a pixmap
        pix = page.get_pixmap(matrix=mat)
        
        # Convert fitz pixmap to PIL Image
        mode = "RGBA" if pix.alpha else "RGB"
        img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
        
        # Save as WebP
        webp_filename = f"{page_num:04d}.webp"
        webp_path = os.path.join(output_folder, webp_filename)
        img.save(webp_path, "WEBP", quality=WEBP_QUALITY)

        # 커버 이미지 생성: 1페이지를 원본 PDF 폴더 위치에 {book_id}_cover.webp로 저장
        if page_num == 1:
            cover_dir = os.path.dirname(os.path.abspath(pdf_path))
            cover_path = os.path.join(cover_dir, f"{book_id}_cover.webp")
            # 이미 저장한 이미지 객체를 그대로 한 번 더 저장
            img.save(cover_path, "WEBP", quality=WEBP_QUALITY)
            print(f"  -> Cover generated: {cover_path}")
        
        # Record page metadata for manifest
        pages_meta.append({
            "page": page_num,
            "image": f"/assets/pages/{book_folder_name}/{webp_filename}",
            "width": pix.width,
            "height": pix.height
        })
        
        # Show simple progress
        if page_num % 10 == 0 or page_num == total_pages:
            print(f"     Progress: {page_num}/{total_pages} pages converted.")
            
    doc.close()
    
    # 4. Update manifest file (e.g., data/manifests/genesis.json)
    manifest_filename = f"{book_id}.json"
    manifest_path = os.path.join(MANIFESTS_DIR, manifest_filename)
    
    # Load existing manifest if exists to preserve other settings (like page_window)
    page_window = 3
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, 'r', encoding='utf-8') as mf:
                old_manifest = json.load(mf)
                page_window = old_manifest.get("page_window", 3)
        except Exception:
            pass
            
    manifest_data = {
        "book_id": book_id,
        "total_pages": total_pages,
        "page_window": page_window,
        "pages": pages_meta
    }
    
    # Write updated manifest
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, 'w', encoding='utf-8') as mf:
        json.dump(manifest_data, mf, indent=2, ensure_ascii=False)
    print(f"  -> Manifest updated: {manifest_path}")

def main():
    print("=" * 60)
    print(" Bible PDF to WebP Converter & Manifest Updater")
    print("=" * 60)
    
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("!!! DRY RUN MODE: Only verifying filename matches !!!\n")
        
    # Check books.json
    if not os.path.exists(BOOKS_JSON_PATH):
        print(f"Error: {BOOKS_JSON_PATH} not found. Please run this script in the project root directory.")
        return
        
    with open(BOOKS_JSON_PATH, 'r', encoding='utf-8') as f:
        books = json.load(f)
        
    # Create input directory if it doesn't exist
    if not os.path.exists(INPUT_DIR):
        os.makedirs(INPUT_DIR)
        print(f"Created '{INPUT_DIR}' directory. Please put your Bible PDF files there and re-run the script.")
        print("Expected PDF filenames should contain Korean names (e.g. 창세기.pdf, 출애굽기.pdf) or English names.")
        return
        
    # Scan input directory for PDF files
    pdf_files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print(f"No PDF files found in '{INPUT_DIR}'.")
        print("Please place your PDF files there and run this script again.")
        return
        
    print(f"Found {len(pdf_files)} PDF file(s) in '{INPUT_DIR}'. Starting processing...\n")
    
    success_count = 0
    failed_files = []
    
    for filename in pdf_files:
        pdf_path = os.path.join(INPUT_DIR, filename)
        
        # Match with book metadata
        book = find_matching_book(filename, books)
        
        if book:
            print(f"File: '{filename}'")
            print(f"  -> Matched book: {book['title_ko']} ({book['title_en']}) -> book-{book['order']:02d}")
            if not dry_run:
                try:
                    process_pdf(pdf_path, book)
                    success_count += 1
                    print(f"  -> Successfully processed {book['title_ko']}!\n")
                except Exception as e:
                    print(f"  -> Error processing file: {e}\n")
                    failed_files.append((filename, str(e)))
            else:
                success_count += 1
                print("  -> Match verified (dry-run).\n")
        else:
            print(f"File: '{filename}'")
            print(f"  -> WARNING: Could not find a matching book for file: {filename}")
            print(f"     Please ensure the file name contains the book name in Korean (e.g., '창세기') or English (e.g., 'Genesis').\n")
            failed_files.append((filename, "Could not match filename to any Bible book"))
            
    print("=" * 60)
    print(" Processing Summary:")
    if dry_run:
        print(f"  - Successfully matched: {success_count}/{len(pdf_files)}")
    else:
        print(f"  - Successfully processed: {success_count}/{len(pdf_files)}")
    if failed_files:
        print("\n  - Failed/Unmatched files:")
        for name, reason in failed_files:
            print(f"    * {name}: {reason}")
    print("=" * 60)

if __name__ == '__main__':
    main()
