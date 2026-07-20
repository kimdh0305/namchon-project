#!/usr/bin/env python3
import argparse
import json
import shutil
from pathlib import Path


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_json_if_exists(path: Path, default):
    if not path.exists():
        return default
    return read_json(path)


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def render_template(path: Path, context: dict[str, str]) -> str:
    content = path.read_text(encoding="utf-8")
    for key, value in context.items():
        content = content.replace(f"{{{{{key}}}}}", value)
    return content


def copy_tree(src: Path, dst: Path) -> None:
    if not src.exists():
        return
    for path in src.rglob("*"):
        if path.is_dir():
            continue
        rel = path.relative_to(src)
        target = dst / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--dist", type=Path, default=Path("dist"))
    args = parser.parse_args()

    root = args.root.resolve()
    dist = (root / args.dist).resolve()
    if dist.exists():
        shutil.rmtree(dist)
    dist.mkdir(parents=True, exist_ok=True)

    books = read_json(root / "data/books.json")
    writers = read_json(root / "data/writers.json")
    toc = read_json(root / "data/toc.json")
    gallery = read_json_if_exists(root / "data/gallery.json", [])

    templates = root / "src/templates"

    base_context = {
        "BOOKS_JSON": json.dumps(books, ensure_ascii=False),
        "WRITERS_JSON": json.dumps(writers, ensure_ascii=False),
        "TOC_JSON": json.dumps(toc, ensure_ascii=False),
        "GALLERY_JSON": json.dumps(gallery, ensure_ascii=False),
    }

    first_book = books[0]
    landing_context = dict(base_context)
    landing_context.update({"BOOK_ID": first_book["book_id"], "BOOK_TITLE": first_book["title_ko"], "MANIFEST_JSON": "{}"})
    write_text(dist / "index.html", render_template(templates / "landing.html", landing_context))

    gallery_context = dict(base_context)
    gallery_context.update({"BOOK_ID": first_book["book_id"], "BOOK_TITLE": first_book["title_ko"], "MANIFEST_JSON": "{}"})
    write_text(dist / "gallery/index.html", render_template(templates / "gallery.html", gallery_context))

    for book in books:
      manifest = read_json(root / "data/manifests" / f"{book['book_id']}.json")
      reader_context = dict(base_context)
      reader_context.update(
          {
              "BOOK_ID": book["book_id"],
              "BOOK_TITLE": book["title_ko"],
              "MANIFEST_JSON": json.dumps(manifest, ensure_ascii=False),
          }
      )
      write_text(
          dist / f"reader/{book['book_id']}/index.html",
          render_template(templates / "reader.html", reader_context),
      )

    copy_tree(root / "src/styles", dist / "styles")
    copy_tree(root / "src/scripts", dist / "scripts")
    copy_tree(root / "src/static", dist)
    copy_tree(root / "assets", dist / "assets")
    copy_tree(root / "data", dist / "data")

    print(f"Static site generated at: {dist}")


if __name__ == "__main__":
    main()
