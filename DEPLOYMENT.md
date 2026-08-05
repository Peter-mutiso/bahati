# Production Deployment Guide — HestiaCP (port 6198)

This documents the exact steps to deploy this Vite + React app on a HestiaCP VPS,
served on port **6198**. Unlike a Next.js app, this is a static SPA — the backend
is entirely Supabase (Postgres + Auth + Edge Functions), so there is no local
database or Node API server to run. The only Node process needed in production
is a static file server for the built `dist/` folder.

> **Port choice:** this box already runs many PM2 apps, and port 3333 was found
> to be taken (or otherwise unreachable) on this specific server, so this
> deployment uses **6198** instead — matching the high-port convention already
> used by the other apps on this machine (`game-safcrash`, etc). If you deploy
> to a fresh server where 3333 is free, either port works — just make sure the
> `-l <port>` flag in Step 8 and the `proxy_pass` port in Step 2's `.stpl`
> always match each other.

---

## 1. Prerequisites (run once on a fresh server)

```bash
# Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install pm2 -g

# serve — lightweight static file server with SPA fallback support
sudo npm install serve -g
```

---

## 2. Create the Nginx Template

Templates live in `/usr/local/hestia/data/templates/web/nginx/php-fpm/`.
You need three files — `.tpl`, `.stpl`, and an empty `.sh` marker.

```bash
sudo tee /usr/local/hestia/data/templates/web/nginx/php-fpm/kointip.tpl > /dev/null << 'EOF'
server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;

    return 301 https://$host$request_uri;
}
EOF

sudo tee /usr/local/hestia/data/templates/web/nginx/php-fpm/kointip.stpl > /dev/null << 'EOF'
server {
    listen      %ip%:%web_ssl_port% ssl;
    server_name %domain_idn% %alias_idn%;
    root        %sdocroot%;

    ssl_certificate      %ssl_pem%;
    ssl_certificate_key  %ssl_key%;

    location / {
        proxy_pass         http://127.0.0.1:6198;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering    off;
        proxy_redirect     off;
        proxy_read_timeout 60s;
    }

    location ~ [^/]\.php(/|$) {
        return 404;
    }

    include %home%/%user%/conf/web/%domain%/nginx.ssl.conf_*;
}
EOF

sudo touch /usr/local/hestia/data/templates/web/nginx/php-fpm/kointip.sh
sudo chmod 755 /usr/local/hestia/data/templates/web/nginx/php-fpm/kointip.sh
```

> **Important:** The `.sh` marker file is required — without it Hestia says "template doesn't exist" even if the `.tpl` and `.stpl` are present.

---

## 3. Add the Domain in HestiaCP

1. Log into HestiaCP → Web → Add Web Domain
2. Domain: `kointip.com` (under Hestia user `joe`)
3. Web Template (Nginx): `kointip`
4. Backend Template: `default`
5. Enable SSL → Let's Encrypt → Force SSL

---

## 4. Apply the Template via CLI

```bash
sudo /usr/local/hestia/bin/v-change-web-domain-tpl joe kointip.com kointip
```

If it errors with "nginx restart failed", check for leftover override files:

```bash
ls /home/joe/conf/web/kointip.com/
# Delete any nginx.ssl.conf_* files that duplicate locations already in the template
sudo rm /home/joe/conf/web/kointip.com/nginx.ssl.conf_kointip
sudo nginx -t && sudo systemctl restart nginx
```

---

## 5. Fix Force-SSL Conflict (run after every template change or SSL renewal)

```bash
sudo sed -i '/nginx.forcessl/d' /home/joe/conf/web/kointip.com/nginx.ssl.conf
sudo nginx -t && sudo systemctl restart nginx
```

---

## 5b. Changing the Port Later

If you already created the Nginx template with one port (e.g. 3333) and need to
switch to another (e.g. because it's already taken on this server), update the
`proxy_pass` line in the `.stpl` **template source**, then re-apply it to the
domain — editing the template alone is not enough, because the domain's actual
live config file was already generated from the old template and won't change
on its own.

```bash
# 1. Update the template source
sudo sed -i 's/127\.0\.0\.1:3333/127.0.0.1:6198/' \
  /usr/local/hestia/data/templates/web/nginx/php-fpm/kointip.stpl

# 2. Re-apply it so the domain's live config regenerates from the updated template
#    (this is the step that's easy to forget — sed-ing the .stpl alone does nothing
#    for a domain that's already provisioned)
sudo /usr/local/hestia/bin/v-change-web-domain-tpl joe kointip.com kointip

# 3. Confirm the live config actually picked up the new port
grep proxy_pass /home/joe/conf/web/kointip.com/nginx.ssl.conf

sudo nginx -t && sudo systemctl restart nginx
```

Then make sure the `serve` process in Step 8 is started with the matching
`-l 6198` flag — the port in the live nginx config and the port `serve`
listens on must always be identical, or you'll get a 502 Bad Gateway.

---

## 6. Configure Environment

Vite bakes `VITE_*` env vars into the build at **build time** — there is no
runtime `.env` read by the deployed app. Create `.env` in the project root
**before running `npm run build`**:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id
```

> Use the values from the Supabase dashboard → Settings → API. The publishable
> (anon) key is safe to ship in the client bundle — never put the `service_role`
> key here.

> **If these values change later, you must rebuild** (`npm run build`) — editing
> `.env` alone does nothing until the next build.

---

## 7. Database and Edge Functions (Supabase, not this server)

There is no database to import on this VPS — Postgres lives entirely on Supabase.

**Migrations** (from your local machine, once per schema change):
```bash
npx supabase link --project-ref your-project-id
npx supabase db push
```

**Edge Functions** (from your local machine, whenever a function under
`supabase/functions/` changes — e.g. `coin-flip-engine`, `cycling-race-engine`):
```bash
npx supabase functions deploy coin-flip-engine
npx supabase functions deploy cycling-race-engine
# or deploy all at once:
npx supabase functions deploy
```

> Edge functions run on Supabase's infrastructure, not on this HestiaCP server —
> deploying them is independent of the steps below.

---

## 8. Build and Start the App

```bash
cd /home/joe/web/kointip.com/public_html

npm install
npm run build          # outputs static files to dist/

pm2 start npx --name "kointip" -- serve -s dist -l 6198
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

> **Use `npx serve`, not bare `serve`.** `pm2 start serve` treats `serve` as a
> relative script path in the current directory and fails with
> `Script not found: .../public_html/serve`, even though `serve` is installed
> globally. Running it via `npx` (through the `npx` interpreter) makes PM2
> resolve the global binary correctly.

`-s dist` tells `serve` to treat `dist/` as a single-page app (any unknown path
falls back to `index.html`), which is required because the app uses React
Router's `BrowserRouter`. `-l 6198` binds it to port 6198, matching the Nginx
`proxy_pass` above.

---

## 9. Verify

```bash
pm2 list                            # kointip should show "online"
sudo nginx -t                       # no errors
curl -I http://127.0.0.1:6198       # should return HTTP 200 locally
curl -I https://kointip.com         # should return HTTP 200 externally
```

Then open the site in a browser and confirm:
- The home page loads and the game carousel/tiles render.
- Navigating directly to a deep link (e.g. `https://kointip.com/coin-flip`)
  loads correctly on refresh (confirms the SPA fallback is working).
- `/adminct` and `/marketer` log in successfully (confirms Supabase env vars
  were baked in correctly).

---

## 10. Redeployment (pushing updates)

```bash
cd /home/joe/web/kointip.com/public_html
git pull
npm install
npm run build
pm2 restart kointip
```

If the update touched `supabase/migrations/` or `supabase/functions/`, also run
the relevant commands from Step 7 (from your local machine or CI, not this server).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "kointip web template doesn't exist" | The `.sh` marker file is missing — `touch kointip.sh` in the php-fpm templates folder |
| nginx restart failed after template change | Check for duplicate location blocks in `nginx.ssl.conf_*` override files and delete them |
| `pm2 start serve` → `Script not found: .../public_html/serve` | PM2 treated `serve` as a relative file path. Use `pm2 start npx --name "kointip" -- serve -s dist -l 6198` instead (see Step 8) |
| 502 Bad Gateway | Run the Force-SSL fix (Step 5), confirm `pm2 list` shows `kointip` online and listening on 6198 |
| `curl 127.0.0.1:<port>` returns 200 but `https://yourdomain` still 502s | The live nginx config for the domain still has the old port baked in. `grep proxy_pass /home/joe/conf/web/kointip.com/nginx.ssl.conf` to check, then re-apply the template (Step 5b) — editing the `.stpl` template alone does not update an already-provisioned domain |
| Blank page / assets 404 after deploy | Env vars changed but the app wasn't rebuilt — `npm run build` again |
| Refreshing a route like `/coin-flip` gives a blank page or 404 | `serve` wasn't started with `-s` (SPA fallback) — restart with `pm2 delete kointip` then redo Step 8 |
| Admin/marketer login fails after deploy | `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` were wrong or missing at build time — fix `.env` and rebuild |
| Edge function changes not taking effect | Edge functions deploy independently via `supabase functions deploy` — a site rebuild does not touch them |
