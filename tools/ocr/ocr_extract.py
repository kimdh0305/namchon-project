# -*- coding: utf-8 -*-
"""OCR extractor for PDF/page images.

Modes:
- full_page (default): crop title/footer from each page and OCR both.
- name_crop: treat each input image as already-cropped name region and OCR as name_raw.
"""

import argparse
import json
import multiprocessing as mp
import os
import re
import sys
import threading
import time
from collections import defaultdict

try:
    from PIL import Image
except Exception:
    Image = None

import config

DEFAULT_IMAGE_EXTS = ["png", "webp", "jpg", "jpeg", "tif", "tiff", "bmp"]

_SOURCE = None
_thread_local = threading.local()


def _cfg(name, default):
    return getattr(config, name, default)


def _extract_page_number(filename):
    m = re.search(r"(\d+)", filename)
    return int(m.group(1)) if m else None


def _is_debug_crop(name_lower):
    return "title_crop" in name_lower or "footer_crop" in name_lower


def _image_exts_set(exts):
    return tuple("." + e.lower().lstrip(".") for e in exts)


def _list_images(folder, exts, recursive=False):
    exts_t = _image_exts_set(exts)
    files = []
    if recursive:
        for root, dirs, names in os.walk(folder):
            dirs.sort()
            for n in sorted(names):
                low = n.lower()
                if low.endswith(exts_t) and not _is_debug_crop(low):
                    files.append(os.path.join(root, n))
    else:
        for n in sorted(os.listdir(folder)):
            low = n.lower()
            if low.endswith(exts_t) and not _is_debug_crop(low):
                files.append(os.path.join(folder, n))
    return files


class PdfSource:
    def __init__(self, pdf_path):
        import fitz

        self._fitz = fitz
        self.doc = fitz.open(pdf_path)
        self.total = len(self.doc)

    def available_pages(self):
        return list(range(1, self.total + 1))

    def get_image(self, page_no):
        page = self.doc[page_no - 1]
        zoom = config.RENDER_DPI / 72.0
        mat = self._fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

    def close(self):
        self.doc.close()


class ImageSource:
    def __init__(self, page_map):
        self.page_map = page_map

    def available_pages(self):
        return sorted(self.page_map.keys())

    def get_image(self, page_no):
        with Image.open(self.page_map[page_no]) as img:
            return img.convert("RGB")

    def close(self):
        pass


def discover_page_images(folder, extensions, recursive=False):
    candidates = _list_images(folder, extensions, recursive=recursive)
    if not candidates:
        where = "(하위 포함)" if recursive else ""
        raise ValueError(f"'{folder}'{where} 에서 이미지 파일을 찾지 못했습니다 (확장자: {extensions}).")

    nums = [_extract_page_number(os.path.basename(p)) for p in candidates]
    page_map = {}
    if all(n is not None for n in nums) and len(set(nums)) == len(nums):
        for p, n in zip(candidates, nums):
            page_map[n] = p
    else:
        print("[안내] 페이지 번호를 추출할 수 없어 정렬 순서로 1부터 부여합니다.", file=sys.stderr)
        for i, p in enumerate(sorted(candidates), start=1):
            page_map[i] = p
    return page_map


def build_source_descriptor(input_path, image_exts, recursive=False):
    if os.path.isdir(input_path):
        return ("images", discover_page_images(input_path, image_exts, recursive=recursive))

    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"입력 경로를 찾을 수 없습니다: {input_path}")

    ext = os.path.splitext(input_path)[1].lower().lstrip(".")
    allowed = [e.lower().lstrip(".") for e in image_exts]
    if ext == "pdf":
        return ("pdf", input_path)
    if ext in allowed:
        page_no = _extract_page_number(os.path.basename(input_path)) or 1
        return ("images", {page_no: input_path})
    raise ValueError(f"지원하지 않는 파일 형식입니다: '{ext}'. PDF 또는 {image_exts} 중 하나여야 합니다.")


def open_source(desc):
    return PdfSource(desc[1]) if desc[0] == "pdf" else ImageSource(desc[1])


def _guess_book_id(path, root):
    rel = os.path.relpath(path, root)
    parts = [p for p in rel.split(os.sep) if p and p != "."]
    if len(parts) >= 2:
        return parts[0]
    parent = os.path.basename(os.path.dirname(path))
    return parent if parent else "unknown-book"


def discover_name_crop_items(input_path, image_exts, recursive=False):
    allowed = [e.lower().lstrip(".") for e in image_exts]

    if os.path.isdir(input_path):
        files = _list_images(input_path, image_exts, recursive=recursive)
        if not files:
            raise ValueError(f"'{input_path}' 에서 이미지 파일을 찾지 못했습니다 (확장자: {image_exts}).")

        grouped = defaultdict(list)
        for p in sorted(files):
            grouped[_guess_book_id(p, input_path)].append(p)

        items = []
        for book_id in sorted(grouped.keys()):
            rows = grouped[book_id]
            nums = [_extract_page_number(os.path.basename(p)) for p in rows]
            if all(n is not None for n in nums) and len(set(nums)) == len(nums):
                for p, n in zip(rows, nums):
                    items.append({"book_id": book_id, "page": n, "source_path": p})
            else:
                print(f"[안내] '{book_id}' 페이지 번호를 추출할 수 없어 정렬 순서로 1부터 부여합니다.", file=sys.stderr)
                for i, p in enumerate(rows, start=1):
                    items.append({"book_id": book_id, "page": i, "source_path": p})
        return sorted(items, key=lambda x: (x["book_id"], x["page"], x["source_path"]))

    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"입력 경로를 찾을 수 없습니다: {input_path}")

    ext = os.path.splitext(input_path)[1].lower().lstrip(".")
    if ext == "pdf":
        raise ValueError("name_crop 모드는 PDF 입력을 지원하지 않습니다.")
    if ext not in allowed:
        raise ValueError(f"지원하지 않는 파일 형식입니다: '{ext}'. {image_exts} 중 하나여야 합니다.")
    return [{
        "book_id": os.path.basename(os.path.dirname(input_path)) or "unknown-book",
        "page": _extract_page_number(os.path.basename(input_path)) or 1,
        "source_path": input_path,
    }]


def box_to_px(box, w, h):
    x0, y0, x1, y1 = box
    return (int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h))


def crop_title_footer(img):
    w, h = img.size
    return img.crop(box_to_px(config.BOOK_TITLE_BOX, w, h)), img.crop(box_to_px(config.FOOTER_BOX, w, h))


def parse_pages(spec):
    if not spec:
        return None
    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            pages.update(range(int(a), int(b) + 1))
        else:
            pages.add(int(part))
    return pages


def load_done_pages(out_path, input_mode="full_page"):
    done = set()
    if not os.path.exists(out_path):
        return done
    with open(out_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                page = int(rec.get("page"))
                if input_mode == "name_crop":
                    book_id = str(rec.get("book_id") or "").strip()
                    if book_id:
                        done.add((book_id, page))
                else:
                    done.add(page)
            except Exception:
                continue
    return done


def _init_worker_tesseract(source_desc):
    global _SOURCE
    import pytesseract

    if getattr(config, "TESSERACT_CMD_PATH", None):
        pytesseract.pytesseract.tesseract_cmd = config.TESSERACT_CMD_PATH
    _SOURCE = open_source(source_desc) if source_desc else None


def _ocr_crop_tesseract(img_crop):
    import pytesseract

    text = pytesseract.image_to_string(
        img_crop,
        lang=config.TESSERACT_LANG,
        config=config.TESSERACT_CONFIG_LINE,
    )
    return " ".join(text.strip().split())


def process_page_tesseract(page_no):
    global _SOURCE
    try:
        img = _SOURCE.get_image(page_no)
        title_crop, footer_crop = crop_title_footer(img)
        return {"page": page_no, "book_raw": _ocr_crop_tesseract(title_crop), "footer_raw": _ocr_crop_tesseract(footer_crop), "engine": "tesseract", "error": None}
    except Exception as e:
        return {"page": page_no, "book_raw": "", "footer_raw": "", "engine": "tesseract", "error": f"{type(e).__name__}: {e}"}


def process_name_crop_tesseract(item):
    try:
        with Image.open(item["source_path"]) as img:
            name_raw = _ocr_crop_tesseract(img.convert("RGB"))
        return {"book_id": item["book_id"], "page": item["page"], "name_raw": name_raw, "engine": "tesseract", "source_path": item["source_path"], "error": None}
    except Exception as e:
        return {"book_id": item["book_id"], "page": item["page"], "name_raw": "", "engine": "tesseract", "source_path": item["source_path"], "error": f"{type(e).__name__}: {e}"}


_AZURE_CLIENT = None
_AZURE_LIMITER = None
_AZURE_SOURCE_DESC = None


def _get_thread_source():
    if not hasattr(_thread_local, "source"):
        _thread_local.source = open_source(_AZURE_SOURCE_DESC)
    return _thread_local.source


def process_page_azure(page_no):
    try:
        source = _get_thread_source()
        img = source.get_image(page_no)
        title_crop, footer_crop = crop_title_footer(img)
        return {"page": page_no, "book_raw": _AZURE_CLIENT.ocr_image(title_crop, rate_limiter=_AZURE_LIMITER), "footer_raw": _AZURE_CLIENT.ocr_image(footer_crop, rate_limiter=_AZURE_LIMITER), "engine": "azure", "error": None}
    except Exception as e:
        return {"page": page_no, "book_raw": "", "footer_raw": "", "engine": "azure", "error": f"{type(e).__name__}: {e}"}


def process_name_crop_azure(item):
    try:
        with Image.open(item["source_path"]) as img:
            name_raw = _AZURE_CLIENT.ocr_image(img.convert("RGB"), rate_limiter=_AZURE_LIMITER)
        return {"book_id": item["book_id"], "page": item["page"], "name_raw": name_raw, "engine": "azure", "source_path": item["source_path"], "error": None}
    except Exception as e:
        return {"book_id": item["book_id"], "page": item["page"], "name_raw": "", "engine": "azure", "source_path": item["source_path"], "error": f"{type(e).__name__}: {e}"}


def _print_progress(done, total, t0):
    elapsed = time.time() - t0
    rate = done / elapsed if elapsed > 0 else 0
    remain = (total - done) / rate if rate > 0 else float("inf")
    print(f"[{done}/{total}] {rate:.2f} page/s, 예상 남은 시간: {remain/60:.1f}분", file=sys.stderr)


def _run_name_crop(args, image_exts):
    items = discover_name_crop_items(args.input, image_exts, recursive=args.recursive)
    page_filter = parse_pages(args.pages) if args.pages else None
    if page_filter is not None:
        target = [x for x in items if x["page"] in page_filter]
    else:
        target = [x for x in items if args.start <= x["page"] <= (args.end if args.end is not None else x["page"])]

    done = load_done_pages(args.out, input_mode="name_crop")
    todo = [x for x in target if (x["book_id"], x["page"]) not in done]
    if args.limit is not None:
        todo = todo[: max(0, args.limit)]

    print(f"입력 형식: name_crop / 발견: {len(items)} / 대상: {len(target)} / 완료: {len(done)} / 남음: {len(todo)}")
    if not todo:
        print("처리할 페이지가 없습니다.")
        return

    t0 = time.time()
    n_done = 0

    if args.engine == "tesseract":
        with open(args.out, "a", encoding="utf-8") as fout, mp.Pool(processes=args.workers, initializer=_init_worker_tesseract, initargs=(None,)) as pool:
            for rec in pool.imap_unordered(process_name_crop_tesseract, todo, chunksize=args.chunk):
                fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
                fout.flush()
                n_done += 1
                if n_done % 100 == 0:
                    _print_progress(n_done, len(todo), t0)
    else:
        global _AZURE_CLIENT, _AZURE_LIMITER
        import azure_ocr

        _AZURE_CLIENT = azure_ocr.AzureReadClient(
            args.azure_endpoint or _cfg("AZURE_VISION_ENDPOINT", None),
            args.azure_key or _cfg("AZURE_VISION_KEY", None),
            api_version=_cfg("AZURE_READ_API_VERSION", "2025-04-01-preview"),
            poll_interval=_cfg("AZURE_READ_POLL_INTERVAL", 0.5),
            timeout=_cfg("AZURE_READ_TIMEOUT", 60.0),
            max_retries=_cfg("AZURE_MAX_RETRIES", 3),
        )
        _AZURE_LIMITER = azure_ocr.RateLimiter(args.azure_rps)

        from concurrent.futures import ThreadPoolExecutor, as_completed

        with open(args.out, "a", encoding="utf-8") as fout, ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(process_name_crop_azure, p) for p in todo]
            for fut in as_completed(futures):
                fout.write(json.dumps(fut.result(), ensure_ascii=False) + "\n")
                fout.flush()
                n_done += 1
                if n_done % 20 == 0:
                    _print_progress(n_done, len(todo), t0)

    print(f"완료. 총 {n_done}페이지 처리, {(time.time()-t0)/60:.1f}분 소요. -> {args.out}")


def _run_full_page(args, image_exts):
    source_desc = build_source_descriptor(args.input, image_exts, recursive=args.recursive)
    probe = open_source(source_desc)
    available = probe.available_pages()
    probe.close()

    if not available:
        print("발견된 페이지 없음")
        return

    kind = source_desc[0]
    print(f"입력 형식: {'PDF' if kind == 'pdf' else '이미지'} / 발견: {len(available)}")

    av_set = set(available)
    if args.pages:
        target = sorted(p for p in parse_pages(args.pages) if p in av_set)
    elif kind == "pdf":
        hi = args.end or max(available)
        target = [p for p in range(args.start, hi + 1) if p in av_set]
    else:
        hi = args.end or max(available)
        target = [p for p in available if args.start <= p <= hi]

    done = load_done_pages(args.out, input_mode="full_page")
    todo = [p for p in target if p not in done]
    if args.limit is not None:
        todo = todo[: max(0, args.limit)]

    print(f"엔진: {args.engine} / 대상: {len(target)} / 완료: {len(done)} / 남음: {len(todo)}")
    if not todo:
        print("처리할 페이지가 없습니다.")
        return

    t0 = time.time()
    n_done = 0

    if args.engine == "tesseract":
        with open(args.out, "a", encoding="utf-8") as fout, mp.Pool(processes=args.workers, initializer=_init_worker_tesseract, initargs=(source_desc,)) as pool:
            for rec in pool.imap_unordered(process_page_tesseract, todo, chunksize=args.chunk):
                fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
                fout.flush()
                n_done += 1
                if n_done % 100 == 0:
                    _print_progress(n_done, len(todo), t0)
    else:
        global _AZURE_CLIENT, _AZURE_LIMITER, _AZURE_SOURCE_DESC
        import azure_ocr

        _AZURE_CLIENT = azure_ocr.AzureReadClient(
            args.azure_endpoint or _cfg("AZURE_VISION_ENDPOINT", None),
            args.azure_key or _cfg("AZURE_VISION_KEY", None),
            api_version=_cfg("AZURE_READ_API_VERSION", "2025-04-01-preview"),
            poll_interval=_cfg("AZURE_READ_POLL_INTERVAL", 0.5),
            timeout=_cfg("AZURE_READ_TIMEOUT", 60.0),
            max_retries=_cfg("AZURE_MAX_RETRIES", 3),
        )
        _AZURE_LIMITER = azure_ocr.RateLimiter(args.azure_rps)
        _AZURE_SOURCE_DESC = source_desc

        from concurrent.futures import ThreadPoolExecutor, as_completed

        with open(args.out, "a", encoding="utf-8") as fout, ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(process_page_azure, p) for p in todo]
            for fut in as_completed(futures):
                fout.write(json.dumps(fut.result(), ensure_ascii=False) + "\n")
                fout.flush()
                n_done += 1
                if n_done % 20 == 0:
                    _print_progress(n_done, len(todo), t0)

    print(f"완료. 총 {n_done}페이지 처리, {(time.time()-t0)/60:.1f}분 소요. -> {args.out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", "--pdf", dest="input", required=True, help="PDF 파일 / 이미지 파일 / 이미지 폴더")
    ap.add_argument("--input-mode", choices=["full_page", "name_crop"], default="full_page")
    ap.add_argument("--recursive", action="store_true", help="폴더 입력 시 하위 폴더까지 탐색")
    ap.add_argument("--image-exts", default=",".join(DEFAULT_IMAGE_EXTS))
    ap.add_argument("--out", default="raw_ocr.jsonl")
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=None)
    ap.add_argument("--pages", default=None, help="예: 12,13,45-50")
    ap.add_argument("--limit", type=int, default=None, help="처리할 최대 항목 수 (예: --limit 1)")
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument("--chunk", type=int, default=1)
    ap.add_argument("--engine", choices=["tesseract", "azure"], default=_cfg("OCR_ENGINE", "tesseract"))
    ap.add_argument("--azure-endpoint", default=None)
    ap.add_argument("--azure-key", default=None)
    ap.add_argument("--azure-rps", type=float, default=0.0)
    args = ap.parse_args()

    # Always start with a fresh output file for each run.
    open(args.out, "w", encoding="utf-8").close()

    image_exts = [e.strip() for e in args.image_exts.split(",") if e.strip()]
    if args.input_mode == "name_crop":
        _run_name_crop(args, image_exts)
    else:
        _run_full_page(args, image_exts)


if __name__ == "__main__":
    main()
