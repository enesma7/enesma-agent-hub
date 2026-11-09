# ENESMA AGENT HUB (Chrome extension)

Manifest V3 popup that lists the same tiles as the Agent Hub home page and opens each one in a tab. Sign-in uses the Hub’s existing email and password, the same Apps Script backend, and the same session cookies (`enesma_sso` for 24 hours, `enesma_dt` for 30 days when the agent trusts the device).

Nothing here changes the live site, Apps Script, or Google Drive. Do not submit this to the Chrome Web Store until Enrique approves it.

## Install for review (Load unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose this `extension` folder (the folder that contains `manifest.json`).
4. Pin **ENESMA AGENT HUB**.
5. Click the toolbar icon. The popup shows a sign-in form and no tiles.
6. Sign in with the same email and password as the Agent Hub. A code is emailed on a new device, same as the website. After sign-in, the home-page tiles appear. Each tile opens in a new tab.

Signing in here also signs in `agent.enesmarealty.com`, Transaction Center, and E-Sign, because the extension writes the same `enesma_sso` cookie (`Domain=.enesmarealty.com`, Secure, SameSite=Lax, 24 hours). Signing out of the popup clears that cookie and calls the Hub’s `logout` action. The 30-day device cookie is left in place, matching the website.

## Build the zip

From this folder:

```bash
./scripts/build.sh
```

That refreshes `fallback/hub.json` from the repo’s `content.js` and `config.js`, then writes `dist/enesma-agent-hub.zip`. The zip’s top level is `manifest.json`. Upload that zip to the Chrome Web Store. Do not upload the `dist` folder itself.

`fallback/hub.json` is only a backup of the public tile list and the sign-in URL. The popup prefers the live files at `https://agent.enesmarealty.com/content.js` and `config.js`, so a tile change on the Hub shows up the next time a signed-in agent opens the popup. The fallback is used only when those files cannot be fetched. `content.js` is parsed as data and is never executed.

The grid is `HUB_CONTENT.site.home` (Compliance, Marketing, Technology, and the other home-page tiles). It is not a second hand-maintained list.

## Chrome Web Store submission

Do this only after the popup and the Technology tile are approved. This package was not submitted.

1. Open the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole) with the Google account that should own the listing. Prefer a brokerage account with 2-step verification, not a personal account that only one person can recover.
2. If that account has never published, accept the developer agreement and pay the one-time registration fee. See **Cost** below.
3. **New item** → upload `dist/enesma-agent-hub.zip`.
4. **Store listing**
   - Name: `ENESMA AGENT HUB` (must match the manifest).
   - Summary: the manifest description, or a sentence that this opens Agent Hub tools after the agent signs in.
   - Category: Productivity.
   - Language: English.
   - Icon: the 128×128 icon in `icons/icon128.png` is already in the package.
   - Screenshots: at least one 1280×800 (or 640×400) image of the signed-in popup. Use the approval screenshots.
   - Privacy policy URL: after this repo is published by GitHub Pages, `https://agent.enesmarealty.com/extension/privacy.html`. Until then, host `privacy.html` at a stable https URL and use that.
5. **Privacy**
   - Single purpose: open the Agent Hub home-page tools after the agent signs in with their existing account.
   - Permission justifications:
     - `cookies`: read and write only `enesma_sso` and `enesma_dt` on `.enesmarealty.com`, the same cookies the Hub website sets.
     - Host access to `script.google.com` and `script.googleusercontent.com`: call the existing sign-in web app.
     - Host access to `*.enesmarealty.com`: load `content.js`, `config.js`, and tile images from `agent.enesmarealty.com`, and set the session cookie on the parent domain so Transaction Center and E-Sign stay signed in.
   - Data use: email and password are sent to the existing sign-in service and the password is not stored. The session cookie is authentication data.
6. **Distribution → Visibility.** Choose **Private**, not Public. See **Who can install it** below. Leave the geographic distribution at All regions unless you want to limit it.
7. Submit for review. Review applies to private and unlisted items too. After it is approved, send the store link only to agents.

The extension does not include a content script, does not request `<all_urls>`, and does not use remote code.

## Cost

Checked against Google’s docs on November 9, 2026.

- **Registration fee:** one-time, not monthly and not charged again per extension. Google’s Chrome developer blog states that creating a publisher account includes a **$5 USD** registration fee ([Chrome Web Store developer dashboard role update](https://developer.chrome.com/blog/cws-role-expansion-developer-dashboard)). The [registration guide](https://developer.chrome.com/docs/webstore/register) describes the same payment as a one-time fee and does not print the dollar amount on that page. The [developer agreement](https://developer.chrome.com/docs/webstore/program-policies/terms) says the amount is set by Google, so the dashboard is what actually gets charged. Budget **$5**, plus any tax Google adds at checkout.
- **Hosting:** **$0.** The Chrome Web Store hosts the package. Tile images and the tile list stay on the existing GitHub Pages site (`agent.enesmarealty.com`). There is no new server.
- **Google Drive / Apps Script:** **no new storage.** The extension does not upload files and does not add Drive folders. A sign-in creates the same kind of session the website already creates. That is one more session row, not a document upload.

## Who can install it

The store has three visibility settings ([distribution docs](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)):

| Visibility | Listed in search | Who can install |
|---|---|---|
| Public | Yes | Anyone |
| Unlisted | No | Anyone who has the store URL |
| Private | No | Only the Google accounts you name |

**Private** is the right setting if the goal is that only ENESMA agents install it.

- **Google Group (best fit without Workspace):** create a group you manage, add each agent’s Google account, and put that group on the item. Members can install. Remove someone from the group when they leave.
- **Trusted testers:** a list of Google accounts on the developer account. The list is shared by every item on that account, so a Group is easier to manage per item.
- **Workspace domain publishing:** only if ENESMA uses Google Workspace and an admin turns on domain publishing. Then the item can appear in the organization’s private store at `https://chrome.google.com/webstore/category/for_your_domain`.

**Unlisted is not private.** Anyone who receives the link can install it. Use unlisted only if agents do not have Google accounts you can put in a Group. The popup still shows no tiles until a real Agent Hub sign-in succeeds, so installing the package does not reveal the tool list. Treat the unlisted link as shareable anyway.

## Security

- The password is held in the form only long enough to send the `login` request. It is not written to `chrome.storage`, `localStorage`, a cookie, or the zip.
- The session token is the same `enesma_sso` cookie the Hub already sets from JavaScript (not HttpOnly, so the website can read it). The extension can read and write cookies on `enesmarealty.com` because that is how Chrome lets an extension set a parent-domain cookie. The code only gets, sets, and removes `enesma_sso` and `enesma_dt`. It does not read other cookies, but the permission would allow a later malicious update to do so. Publish from a locked-down Google account and keep the listing private.
- No content script is injected into the Hub, Gmail, or Drive. The Apps Script project is not modified, and no new OAuth scope or Drive file is added.
- A compromised publisher account is the main new risk: Chrome would ship whatever update that account uploads. That is store-account risk, not a new hole in the Drive backend.
- The tile list is public static content on the Hub. It is fetched only after `me` succeeds.

## What this folder does not change

`auth.js`, `app.js`, and the Apps Script web app are untouched. The only Hub edits outside this folder are the Open House Dashboard tile and a cache-bust on `content.js`.
