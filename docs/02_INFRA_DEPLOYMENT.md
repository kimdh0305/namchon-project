# Infrastructure & Deployment
 
## Recommended Architecture
QR
-> scripture.church.com
-> Cloudflare CDN
-> Cloudflare Pages
-> Static HTML/JSON
 
Images:
Cloudflare R2
 
## Principles
- Static-first
- No runtime PDF rendering
- No DB dependency preferred
- Lazy loading required
- WEBP only in production
 
## Performance
Load only nearby pages:
current ±3 pages
