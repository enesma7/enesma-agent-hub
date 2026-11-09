# ENESMA AGENT HUB (Chrome extension)

Manifest V3 popup that lists the same tiles as the Agent Hub home page and opens each one in a tab. Sign-in uses the Hub’s existing email and password, the same Apps Script backend, and the same session cookies (`enesma_sso` for 24 hours, `enesma_dt` for 30 days when the agent trusts the device).

Nothing here changes Apps Script or Google Drive. Enrique approved a **public** Chrome Web Store listing. Anyone can find and install it. The popup still shows no tiles until an ENESMA Agent Hub sign-in succeeds. This package has not been submitted.

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

That refreshes `fallback/hub.json` from the repo’s `content.js` and `config.js`, then writes `dist/enesma-agent-hub.zip` and copies it to `store/enesma-agent-hub.zip`. The zip’s top level is `manifest.json`. Upload `store/enesma-agent-hub.zip`. Do not upload the `store` folder or the `dist` folder.

`fallback/hub.json` is only a backup of the public tile list and the sign-in URL. The popup prefers the live files at `https://agent.enesmarealty.com/content.js` and `config.js`, so a tile change on the Hub shows up the next time a signed-in agent opens the popup. The fallback is used only when those files cannot be fetched. `content.js` is parsed as data and is never executed.

The grid is `HUB_CONTENT.site.home` (Compliance, Marketing, Technology, and the other home-page tiles). It is not a second hand-maintained list.

## Chrome Web Store submission

Listing copy, the 128px icon, the 1280×800 screenshot, and the 440×280 promo tile are in [`store/LISTING.md`](store/LISTING.md). Upload `store/enesma-agent-hub.zip`. Set visibility to **Public**. The privacy policy URL, after GitHub Pages publishes this branch, is `https://agent.enesmarealty.com/privacy-extension.html`.

1. Open the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole) with the Google account that should own the listing. Prefer a brokerage account with 2-step verification.
2. If that account has never published, accept the developer agreement and pay the one-time registration fee. See **Cost** below.
3. **New item** → upload `store/enesma-agent-hub.zip`.
4. Fill the listing from `store/LISTING.md`. Category: **Productivity**. Language: English.
5. **Distribution → Visibility: Public.** All regions.
6. Submit for review. Do not submit until you are ready for anyone to find the listing. Sign-in still requires an ENESMA Agent Hub account.

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

Enrique approved **Public**. Anyone can find and install the extension. The popup shows no tiles until a real Agent Hub sign-in succeeds, so installing it does not reveal the tool list.

Private (a Google Group, trusted testers, or Workspace domain publishing) and Unlisted (anyone with the store URL) remain available in the dashboard if that decision changes. Unlisted is not access control.

## Security

- The password is held in the form only long enough to send the `login` request. It is not written to `chrome.storage`, `localStorage`, a cookie, or the zip.
- The session token is the same `enesma_sso` cookie the Hub already sets from JavaScript (not HttpOnly, so the website can read it). The extension can read and write cookies on `enesmarealty.com` because that is how Chrome lets an extension set a parent-domain cookie. The code only gets, sets, and removes `enesma_sso` and `enesma_dt`. It does not read other cookies, but the permission would allow a later malicious update to do so. The listing is public, so protect the publisher account with 2-step verification.
- No content script is injected into the Hub, Gmail, or Drive. The Apps Script project is not modified, and no new OAuth scope or Drive file is added.
- A compromised publisher account is the main new risk: Chrome would ship whatever update that account uploads. That is store-account risk, not a new hole in the Drive backend.
- The tile list is public static content on the Hub. It is fetched only after `me` succeeds.

## What this folder does not change

`auth.js`, `app.js`, and the Apps Script web app are untouched. The only Hub page added outside this folder is `privacy-extension.html`.
