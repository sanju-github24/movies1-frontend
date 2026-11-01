# Serving the frontend from the Delhi VPS (no more Vercel)

Vercel's origin-transfer cap is why the account kept getting burned. The Delhi
VPS already runs the backend + cloudflared, so it serves the static build too —
through Cloudflare's cache, so VPS egress stays tiny (hashed JS/CSS, cached a
year; video never touches this box).

`vercel.json` is removed; nginx replaces it (`deploy/nginx-movies1-frontend.conf`).

## 1. Clone + build on the VPS (one-time)
```bash
cd /opt
git clone https://github.com/sanju-github24/movies1-frontend.git
cd movies1-frontend

# production env — Vite inlines these at build time. Point at the real backend(s)
# (the app calls them directly over CORS; no same-origin /api proxy needed).
cat > .env.production <<'EOF'
VITE_BACKEND_URLS=https://api.1anchormovies.buzz,https://api3.1anchormovies.buzz
VITE_SUPABASE_URL=https://oldhaibgfhtlsrptankf.supabase.co
VITE_SUPABASE_ANON_KEY=<copy the anon key from your old Vercel env>
EOF

npm ci
npm run build          # -> /opt/movies1-frontend/dist
```

## 2. nginx
```bash
sudo cp deploy/nginx-movies1-frontend.conf /etc/nginx/sites-available/movies1-frontend
sudo ln -s ../sites-available/movies1-frontend /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# sanity: curl -I http://127.0.0.1:8080  -> 200, serves index.html
```

## 3. Route the apex + www through the existing cloudflared tunnel
Add to the anchor-delhi tunnel config (`/etc/cloudflared/config.yml`), above the
catch-all `- service: http_status:404`:
```yaml
  - hostname: 1anchormovies.buzz
    service: http://localhost:8080
  - hostname: www.1anchormovies.buzz
    service: http://localhost:8080
```
Then create the DNS routes (adds the proxied CNAME to Cloudflare automatically):
```bash
cloudflared tunnel route dns anchor-delhi 1anchormovies.buzz
cloudflared tunnel route dns anchor-delhi www.1anchormovies.buzz
sudo systemctl restart cloudflared
```

## 4. Cloudflare DNS cleanup
- **Delete** the two apex A records pointing at Vercel (`76.76.21.21`, `216.198.79.193`).
- Step 3 adds `1anchormovies.buzz` + `www` as **Proxied** CNAMEs to the tunnel
  (`<uuid>.cfargotunnel.com`) — leave them Proxied (orange) so Cloudflare caches.
- Remove the stale `_vercel` / `_vercel.www` TXT records.
- Leave `api.` / `dl.` / `live.` / `upload.` / `stream.` exactly as they are.
- SSL/TLS mode: **Full (strict)** is fine (cloudflared terminates internally).

## 5. Updating later (replaces the Vercel auto-deploy)
```bash
cd /opt/movies1-frontend && git pull && npm ci && npm run build && sudo systemctl reload nginx
```
(The Castle change + this migration deploy on the next build.)
