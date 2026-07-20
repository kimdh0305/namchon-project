# Deployment Guide (Cloudflare Pages + R2)

## 1) Build
```bash
npm install
npm run build
```

## 2) Output
- Static site: `dist/`
- Main routes:
  - `/` (landing)
  - `/reader/:bookId` (reader)
  - `/gallery` (gallery)

## 3) Cloudflare Pages project settings
- Build command: `npm run build`
- Build output directory: `dist`

## 4) Cache policy
- `dist/_headers` is copied from `src/static/_headers`
- Strategy:
  - `/assets/*`: 1 year immutable
  - `/data/*`: 5 minutes + SWR
  - HTML: short cache + SWR

## 5) Redirects
- `dist/_redirects` is copied from `src/static/_redirects`
- Current redirect:
  - `/reader` -> `/reader/genesis` (302)

## 6) R2 integration (recommended)
- Keep large WEBP assets in R2 with CDN domain (e.g. `https://cdn.scripture.church.com`)
- If using R2 domain, update:
  - `data/manifests/*.json` image URLs
  - `data/books.json` cover URLs
  - `data/gallery.json` image URLs

## 7) QR-first
- QR base URL: `https://scripture.church.com`
- Deep-link example:
  - `https://scripture.church.com/reader/genesis?page=12`
