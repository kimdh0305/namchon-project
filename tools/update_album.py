#!/usr/bin/env python3
"""
[제작 앨범 자동 생성 & WebP 자동 변환 & 시간순 자동 정렬 스크립트]

사용법:
  # 스크립트를 돌릴 때마다 기존 history.json 앨범 목록 뒤에 새로운 이미지를 추가하고,
  # 전체 앨범 목록을 날짜시간 순(오래된 순 -> 최신 순)으로 자동 재정렬합니다.
  python tools/update_album.py --dir assets/gallery

  # 전체 목록을 새로 덮어쓰고 완전히 동기화하고 싶을 때:
  python tools/update_album.py --dir assets/gallery --overwrite

기능:
  1. JPG, PNG, JFIF 등의 사진이 있으면 고품질 WebP로 자동 변환합니다. (스마트폰 회전 방향 EXIF 자동 정돈)
  2. 파일명에서 날짜(YYYY-MM-DD 또는 YYYY-MM)와 제목(title)을 자동 추출합니다.
  3. 이미지 추가 시 중복을 자동으로 방지하며, 전체 앨범을 날짜 시간순(YYYY-MM-DD)으로 자동 재정렬 및 ID(alb-01, alb-02...)를 새로 부여합니다.
"""

import argparse
import datetime
import json
import re
from pathlib import Path

try:
    from PIL import Image, ImageOps
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

IMAGE_EXTENSIONS = {".webp", ".jpg", ".jpeg", ".png", ".jfif"}
DEFAULT_R2_BASE = "https://pub-2ae8b46c1ff5400481a480cff09faf89.r2.dev/gallery"


def convert_image_to_webp(img_path: Path, quality: int = 85, keep_original: bool = False) -> Path:
    """JPG, PNG 등 이미지를 최적화된 WebP로 자동 변환합니다."""
    if not HAS_PIL or img_path.suffix.lower() == ".webp":
        return img_path

    target_path = img_path.with_suffix(".webp")
    try:
        with Image.open(img_path) as img:
            # 스마트폰 카메라 회전 정보(EXIF) 자동 반영
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "LA", "P"):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

            img.save(target_path, "WEBP", quality=quality)
            print(f"  [변환] WebP 자동 변환 완료: {img_path.name} -> {target_path.name}")

        if not keep_original and target_path.exists() and img_path != target_path:
            img_path.unlink()  # 원본 삭제하여 폴더를 깔끔하게 유지

        return target_path
    except Exception as e:
        print(f"  [경고] WebP 변환 중 오류 ({img_path.name}): {e}")
        return img_path


def parse_filename(filename: str):
    """
    파일명에서 date(YYYY-MM-DD 또는 YYYY-MM)와 title을 추출합니다.
    """
    stem = Path(filename).stem
    date_str = ""
    title_raw = stem

    # 1) YYYY-MM-DD 또는 YYYY.MM.DD 또는 YYYY_MM_DD
    match_ymd = re.match(r"^(\d{4})[-._](\d{2})[-._](\d{2})[-_\s]+(.+)$", stem)
    if match_ymd:
        date_str = f"{match_ymd.group(1)}-{match_ymd.group(2)}-{match_ymd.group(3)}"
        title_raw = match_ymd.group(4)
    else:
        # 2) YYYY-MM 또는 YYYY.MM (DD가 누락된 경우)
        match_ym = re.match(r"^(\d{4})[-._](\d{2})[-_\s]+(.+)$", stem)
        if match_ym:
            date_str = f"{match_ym.group(1)}-{match_ym.group(2)}"
            title_raw = match_ym.group(3)
        else:
            # 3) 8자리 숫자 YYYYMMDD
            match_digits8 = re.match(r"^(\d{4})(\d{2})(\d{2})[-_\s]+(.+)$", stem)
            if match_digits8:
                date_str = f"{match_digits8.group(1)}-{match_digits8.group(2)}-{match_digits8.group(3)}"
                title_raw = match_digits8.group(4)
            else:
                # 4) 6자리 숫자 YYYYMM (DD 누락)
                match_digits6 = re.match(r"^(\d{4})(\d{2})[-_\s]+(.+)$", stem)
                if match_digits6:
                    date_str = f"{match_digits6.group(1)}-{match_digits6.group(2)}"
                    title_raw = match_digits6.group(3)

    # 언더바(_)를 공백으로 변환
    title = title_raw.replace("_", " ").strip()
    # 뒤쪽 식별 번호 (_1, -01 등) 제거
    title = re.sub(r"[-_\s]+\d+$", "", title).strip()

    return date_str, title


def update_album(
    img_dir: Path,
    r2_base: str,
    root_dir: Path,
    use_local_path: bool = False,
    keep_originals: bool = False,
    overwrite_mode: bool = False,
    sort_chronological: bool = True,
):
    history_file = root_dir / "data/history.json"
    gallery_file = root_dir / "data/gallery.json"

    # 기존 history.json 읽기
    existing_album = []
    existing_srcs = set()
    if history_file.exists():
        try:
            with open(history_file, "r", encoding="utf-8") as f:
                history_data = json.load(f)
                existing_album = history_data.get("album", [])
                existing_srcs = {item.get("src") for item in existing_album if "src" in item}
        except Exception:
            existing_album = []

    # 폴더가 존재하는 경우 이미지 추가/업데이트 처리
    new_album_items = []
    if img_dir.exists():
        raw_files = sorted(
            [f for f in img_dir.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS]
        )

        if raw_files:
            print(f"[스캔] 폴더 스캔 중... ({len(raw_files)}개 이미지 발견)")
            processed_files = []
            for f in raw_files:
                if f.suffix.lower() != ".webp":
                    converted = convert_image_to_webp(f, quality=85, keep_original=keep_originals)
                    if converted not in processed_files:
                        processed_files.append(converted)
                else:
                    if f not in processed_files:
                        processed_files.append(f)

            processed_files = sorted(list(set(processed_files)))

            for idx, f in enumerate(processed_files, start=1):
                src_url = f"/assets/gallery/{f.name}" if use_local_path else f"{r2_base.rstrip('/')}/{f.name}"

                if not overwrite_mode and src_url in existing_srcs:
                    continue

                date_str, title = parse_filename(f.name)
                if not date_str:
                    mtime = datetime.datetime.fromtimestamp(f.stat().st_mtime)
                    date_str = mtime.strftime("%Y-%m-%d")

                item = {
                    "id": f"alb-temp-{idx}",
                    "title": title,
                    "date": date_str,
                    "src": src_url,
                }
                new_album_items.append(item)

    if overwrite_mode:
        final_album = new_album_items
    else:
        final_album = existing_album + new_album_items

    # 시간순(Date) 정렬 및 ID 재부여 (오래된 순 -> 최신 순)
    if sort_chronological:
        final_album.sort(key=lambda item: (item.get("date", ""), item.get("src", "")))

    # 순차적 ID 재부여 (alb-01, alb-02 ...)
    for idx, item in enumerate(final_album, start=1):
        item["id"] = f"alb-{idx:02d}"

    print(f"[정렬] 시간순 자동 정렬 완료 (총 {len(final_album)}개 항목)")

    # history.json 저장
    if history_file.exists():
        with open(history_file, "r", encoding="utf-8") as f:
            history_data = json.load(f)
        history_data["album"] = final_album
        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(history_data, f, ensure_ascii=False, indent=2)
        print(f"[완료] data/history.json 저장 완료 (총 {len(final_album)}개)")

    # gallery.json 저장
    gallery_data = {"items": final_album}
    with open(gallery_file, "w", encoding="utf-8") as f:
        json.dump(gallery_data, f, ensure_ascii=False, indent=2)
    print(f"[완료] data/gallery.json 저장 완료 (총 {len(final_album)}개)")


def main():
    parser = argparse.ArgumentParser(description="제작 앨범 자동 생성 & WebP 변환 & 시간순 정렬 스크립트")
    parser.add_argument("--dir", type=Path, default=Path("assets/gallery"), help="이미지가 저장된 폴더 경로")
    parser.add_argument("--r2-base", type=str, default=DEFAULT_R2_BASE, help="R2 스토리지 기본 URL")
    parser.add_argument("--local", action="store_true", help="R2 대신 로컬 /assets/gallery/ 경로 사용")
    parser.add_argument("--keep-original", action="store_true", help="WebP 변환 후 원본 JPG/PNG 파일 보존")
    parser.add_argument("--overwrite", action="store_true", help="기존 history.json 목록을 덮어쓰고 폴더 내용으로 전체 새로 동기화")

    args = parser.parse_args()
    root_dir = Path(__file__).resolve().parent.parent

    update_album(
        img_dir=args.dir if args.dir.is_absolute() else root_dir / args.dir,
        r2_base=args.r2_base,
        root_dir=root_dir,
        use_local_path=args.local,
        keep_originals=args.keep_original,
        overwrite_mode=args.overwrite,
    )


if __name__ == "__main__":
    main()
