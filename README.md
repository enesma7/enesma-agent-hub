# ENESMA Agent Hub (`agent.enesmarealty.com`)

Second GitHub Pages site for **Path B** of the Agent Hub cutover. It publishes the Hub files from [`enesma7/enesma-app`](https://github.com/enesma7/enesma-app) `hub/` at the **root**, so `https://agent.enesmarealty.com/` can become the signed-in Hub login without changing `app.enesmarealty.com`.

Source of truth: `https://github.com/enesma7/enesma-app/tree/main/hub`  
This repo’s only Pages custom domain: `agent.enesmarealty.com`  
Pages source: `main` branch, site root (`/`)

Do **not** put `agent.enesmarealty.com` in `enesma-app`’s root `CNAME`. That file must stay `app.enesmarealty.com`, or live Transaction Center, E-Sign, `/hub/`, and the Agent Hub install landing would break.

## What this repo does not change

These stay on `enesma-app` / `enesma-apps` and were not edited for this cutover:

| URL | Role |
|---|---|
| `https://app.enesmarealty.com/` | Agent Hub **Add to Home Screen / PWA install landing** (`index.html` + `manifest.webmanifest`) |
| `https://app.enesmarealty.com/transactions/install.html` | Transaction Center **Add to Home Screen / PWA install landing** |
| `https://app.enesmarealty.com/hub/` | Same Hub app, still published from `enesma-app` |
| `https://app.enesmarealty.com/transactions/` | Transaction Center |
| `https://app.enesmarealty.com/esign/` | E-Sign |
| `https://apps.enesmarealty.com/` | App chooser (`?p=ios` / `?p=android`) |

The chooser and install landings keep their current URLs and behavior. After the `agent` DNS flip, an already-installed Agent Hub icon still opens `https://app.enesmarealty.com/` in standalone mode, and that landing still redirects to `https://agent.enesmarealty.com` — which will then serve this Hub instead of the old Google Site.

## Sync

A GitHub Actions workflow that copies publishable files from `enesma-app/hub` every 30 minutes (and on `workflow_dispatch`) is saved as [`docs/sync-from-enesma-app.yml`](docs/sync-from-enesma-app.yml). The token used to create this repo does not have the `workflow` scope, so the file is not yet in `.github/workflows/`. To enable automatic sync, copy it there (or upload it in the Actions UI) with an account that can manage workflows. It does not copy `CUTOVER.md`, `agent-rewrite-worker.js`, or `LAYOUT-SPEC.md`, and it never overwrites this README, `404.html`, or `hub/index.html`.

Until that workflow is enabled, re-copy the publishable files from `enesma-app/hub` after Hub changes (everything except those docs files), and keep the root `CNAME` as `agent.enesmarealty.com`.

`404.html` turns old pretty URLs (`/compliance`, `/refer`, and `/hub/…`) into Hub hash routes (`/#/compliance`, and so on).

## Remaining cutover steps (no nameserver move, no Cloudflare)

Do these only after this Pages site is enabled. Do **not** edit `app`, `apps`, `www`, `calculators`, `compliance`, or the zone nameservers.

### 1. GitHub Pages domain verification (only if GitHub shows a TXT challenge)

In the repo: **Settings → Pages**. If GitHub asks to verify `agent.enesmarealty.com`, it will show a TXT record like:

- **Type:** TXT
- **Host (GoDaddy):** `_github-pages-challenge-enesma7.agent`  
  (GoDaddy appends `.enesmarealty.com`. Do not paste the full hostname if the UI already includes the domain.)
- **Value:** the token GitHub displays (not known until that screen appears)

Add that TXT at GoDaddy and click **Verify** on GitHub. Do not change the existing `agent` CNAME yet.

Existing `app` / `apps` / `calculators` / `compliance` sites already use `enesma7.github.io` and have no `_github-pages-challenge-enesma7` TXT in public DNS, so GitHub may accept the new CNAME without a new challenge. If Settings → Pages has no verification prompt, skip this step.

### 2. GoDaddy — change only the `agent` CNAME

1. Sign in at [https://sso.godaddy.com](https://sso.godaddy.com) (login is in the Passwords Google Sheet; do not ask Enrique to type it).
2. **My Products → Domains → enesmarealty.com → DNS** (or **DNS Management**).
3. Find the **CNAME** record whose name is `agent` (hostname `agent.enesmarealty.com`).
4. **Optional but helpful:** set TTL to 300, save, and wait at least the previous TTL (usually 1 hour) before the next edit.
5. Edit that record only:
   - **Type:** CNAME (unchanged)
   - **Name/Host:** `agent` (unchanged)
   - **Value / Points to:** `enesma7.github.io`  
     (replace `ghs.googlehosted.com`)
   - Do not add a trailing dot unless GoDaddy requires it; `enesma7.github.io` is enough.
6. Save. Do **not** change:
   - `app` CNAME (`enesma7.github.io`)
   - `apps` CNAME (`enesma7.github.io`)
   - `www` CNAME (`ghs.googlehosted.com`)
   - nameservers (`ns43.domaincontrol.com` / `ns44.domaincontrol.com`)
   - apex A records
7. Wait for DNS (check [whatsmydns.net CNAME for agent.enesmarealty.com](https://www.whatsmydns.net/#CNAME/agent.enesmarealty.com)). Then confirm:
   - `curl -sI https://agent.enesmarealty.com/` is from `GitHub.com`, not Google `ESF`
   - the Hub login card appears at `https://agent.enesmarealty.com/`
   - `https://app.enesmarealty.com/hub/`, `/transactions/`, and `/esign/` still load
   - `https://apps.enesmarealty.com/` and `https://app.enesmarealty.com/` still show the install chooser / Agent Hub landing

If GitHub Pages Settings shows an HTTPS error, wait for the certificate (often a few minutes after DNS is correct), then enable **Enforce HTTPS** if it is not already on.

### 3. Google Sites — remove the old custom domain (as `enesma7`)

Do this **after** the DNS flip is answering from GitHub Pages.

1. Sign in to Google as `enesma7@gmail.com`.
2. Open the published site **ENESMA Realty | AGENT HUB** (also at `https://sites.google.com/view/enesma-realty-agent-hub`).
3. **Settings → Custom domains**.
4. Remove `agent.enesmarealty.com` only.
5. Leave the site published at the `sites.google.com` URL as a fallback. Do **not** remap the custom domain.

### Rollback

At GoDaddy, change the `agent` CNAME back to `ghs.googlehosted.com`. As `enesma7`, add `agent.enesmarealty.com` back on the old Google Site custom domains. Leave this repo and `enesma-app` alone.

## Smoke test after DNS flip

- `https://agent.enesmarealty.com/` shows the Hub login card (not the public Google Site).
- Sign in with a TC account → Home, then Transaction Center, E-Sign, and My E-Books without a second login (`enesma_sso` cookie, `Domain=.enesmarealty.com`).
- `https://agent.enesmarealty.com/compliance` and `/refer` redirect to the matching hash routes.
- “Agent Hub” back-links from TC / E-Sign / Office Hubs / `apps.enesmarealty.com` return to the new login/home.
- `https://www.enesmarealty.com/` is still the consumer Google Site.
- Agent Hub and Transaction Center home-screen install flows still work from `apps.enesmarealty.com` and the `app.enesmarealty.com` landings above.
