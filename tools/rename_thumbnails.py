#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
이북 썸네일 파일명 일괄 변환기.

  이북썸네일_01창세기.webp  ->  thumbnail_01_genesis.webp
  이북썸네일_44사도행전.webp ->  thumbnail_44_acts.webp

- 파일명에서 (숫자)(한글 책이름) 을 뽑아, 한글 책이름을 영문 book_id 로 매핑합니다.
- 앞의 숫자는 원본 그대로 유지합니다(01~66 등).
- book_id 는 프로젝트 표기와 동일(사무엘상 -> first-samuel 처럼 하이픈 포함).

사용법:
  # 미리보기(실제 변경 안 함)
  python tools/rename_thumbnails.py --dir "C:\\path\\to\\thumbnails" --dry-run
  # 실제 변환
  python tools/rename_thumbnails.py --dir "C:\\path\\to\\thumbnails"
"""
import argparse
import re
import sys
import unicodedata
from pathlib import Path

# 한글 책이름 -> 영문 book_id (66권)
BOOK_KO_TO_ID = {
    # 구약
    "창세기": "genesis", "출애굽기": "exodus", "레위기": "leviticus",
    "민수기": "numbers", "신명기": "deuteronomy", "여호수아": "joshua",
    "사사기": "judges", "룻기": "ruth",
    "사무엘상": "first-samuel", "사무엘하": "second-samuel",
    "열왕기상": "first-kings", "열왕기하": "second-kings",
    "역대상": "first-chronicles", "역대하": "second-chronicles",
    "에스라": "ezra", "느헤미야": "nehemiah", "에스더": "esther",
    "욥기": "job", "시편": "psalms", "잠언": "proverbs",
    "전도서": "ecclesiastes", "아가": "song-of-songs", "이사야": "isaiah",
    "예레미야": "jeremiah", "예레미야애가": "lamentations", "에스겔": "ezekiel",
    "다니엘": "daniel", "호세아": "hosea", "요엘": "joel", "아모스": "amos",
    "오바댜": "obadiah", "요나": "jonah", "미가": "micah", "나훔": "nahum",
    "하박국": "habakkuk", "스바냐": "zephaniah", "학개": "haggai",
    "스가랴": "zechariah", "말라기": "malachi",
    # 신약
    "마태복음": "matthew", "마가복음": "mark", "누가복음": "luke",
    "요한복음": "john", "사도행전": "acts", "로마서": "romans",
    "고린도전서": "first-corinthians", "고린도후서": "second-corinthians",
    "갈라디아서": "galatians", "에베소서": "ephesians", "빌립보서": "philippians",
    "골로새서": "colossians",
    "데살로니가전서": "first-thessalonians", "데살로니가후서": "second-thessalonians",
    "디모데전서": "first-timothy", "디모데후서": "second-timothy",
    "디도서": "titus", "빌레몬서": "philemon", "히브리서": "hebrews",
    "야고보서": "james", "베드로전서": "first-peter", "베드로후서": "second-peter",
    "요한일서": "first-john", "요한이서": "second-john", "요한삼서": "third-john",
    "유다서": "jude", "요한계시록": "revelation",
}

# 이북썸네일_<숫자><한글이름>.webp   (숫자/이름 사이 공백·언더스코어 허용)
PATTERN = re.compile(r"^이북썸네일[_\s]*([0-9]+)[_\s]*(.+)$")


def convert_name(stem: str):
    """파일명(확장자 제외) -> 새 파일명(확장자 제외). 매칭 실패 시 None."""
    s = unicodedata.normalize("NFC", stem).strip()
    m = PATTERN.match(s)
    if not m:
        return None
    number, ko = m.group(1), m.group(2).strip()
    book_id = BOOK_KO_TO_ID.get(ko)
    if book_id is None:
        return None
    return f"thumbnail_{number}_{book_id}"


def main() -> None:
    ap = argparse.ArgumentParser(description="이북썸네일_NN한글.webp -> thumbnail_NN_book-id.webp")
    ap.add_argument("--dir", required=True, type=Path, help="썸네일 파일들이 있는 폴더")
    ap.add_argument("--ext", default=".webp", help="대상 확장자 (기본 .webp)")
    ap.add_argument("--dry-run", action="store_true", help="실제로 바꾸지 않고 미리보기만")
    args = ap.parse_args()

    folder: Path = args.dir
    if not folder.is_dir():
        print(f"[오류] 폴더가 없습니다: {folder}")
        sys.exit(1)

    ext = args.ext.lower()
    files = sorted(p for p in folder.iterdir()
                   if p.is_file() and p.suffix.lower() == ext)

    renamed = skipped = 0
    for src in files:
        new_stem = convert_name(src.stem)
        if new_stem is None:
            print(f"[건너뜀] 규칙에 안 맞음: {src.name}")
            skipped += 1
            continue
        dst = src.with_name(new_stem + src.suffix.lower())
        if dst == src:
            print(f"[유지] 이미 올바른 이름: {src.name}")
            continue
        if dst.exists():
            print(f"[건너뜀] 대상 파일이 이미 존재: {dst.name}  (원본: {src.name})")
            skipped += 1
            continue
        print(f"{'[미리보기] ' if args.dry_run else ''}{src.name}  ->  {dst.name}")
        if not args.dry_run:
            src.rename(dst)
        renamed += 1

    action = "변환 예정" if args.dry_run else "변환 완료"
    print(f"\n{action}: {renamed}개 · 건너뜀: {skipped}개 · 전체 {ext}: {len(files)}개")
    if args.dry_run:
        print("실제로 바꾸려면 --dry-run 을 빼고 다시 실행하세요.")


if __name__ == "__main__":
    main()
