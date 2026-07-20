# Deployment Guide (Cloudflare Pages + R2)

## 1) Build
```bash
python3 tools/build/run_pipeline.py
```

## 2) Output
- Static site: `dist/`
- Main routes:
  - `/` (landing)
  - `/reader/book-01/` (reader)
  - `/gallery/` (gallery)

## 3) Cloudflare Pages project settings
- Build command: `python3 tools/build/run_pipeline.py`
- Build output directory: `dist`

## 4) Cache policy
- `dist/_headers` is generated from `src/static/_headers`
- Strategy:
  - `/assets/*`: 1 year immutable
  - `/data/*`: 5 minutes + SWR
  - HTML: short cache + SWR

## 5) Redirects
- `dist/_redirects` is generated from `src/static/_redirects`
- Current redirect:
  - `/reader` -> `/reader/book-01/` (302)

## 6) R2 integration (recommended)
- Keep large WEBP assets in R2 with CDN domain (e.g. `https://cdn.scripture.church.com`)
- If using R2 domain, update:
  - `data/manifests/book-01.json` image URLs
  - `data/books.json` cover URL
  - `data/gallery.json` gallery image URL

## 7) QR-first
- QR base URL: `https://scripture.church.com`
- Deep-link example:
  - `https://scripture.church.com/reader/book-01/?page=12`

