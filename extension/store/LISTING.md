# Chrome Web Store listing — ENESMA AGENT HUB

Upload `enesma-agent-hub.zip` from this folder. Visibility: **Public**. Category: **Productivity**. Language: English.

The privacy policy URL works after GitHub Pages publishes this branch:

https://agent.enesmarealty.com/privacy-extension.html

## Files

| File | Use |
|---|---|
| `enesma-agent-hub.zip` | Package to upload. `manifest.json` is at the top of the zip. |
| `icon-128.png` | Store icon, 128×128. The same icon is inside the zip at `icons/icon128.png`. |
| `screenshot-1280x800.png` | At least one screenshot, 1280×800. |
| `promo-tile-440x280.png` | Small promo tile, 440×280. |

## Name

ENESMA AGENT HUB

## Short description

132 characters is the limit. This one is 72.

Open ENESMA Agent Hub tools from Chrome. Sign in with your Hub account.

## Detailed description

ENESMA AGENT HUB opens the same tiles as the Agent Hub home page from a Chrome toolbar popup.

The listing is public, so anyone can find and install it. The popup shows a sign-in form and no tiles until you sign in with the same email and password as the Agent Hub and Transaction Center. A code may be emailed when you sign in from a new device, the same as the website. After you sign in, each tile opens in a new tab. Signing in also signs in agent.enesmarealty.com, Transaction Center, and E-Sign.

The tiles are Compliance, Marketing, Technology, Office Listings, Training Library, Preferred Partners, Calculators, Office Hubs, Shop, and Contact the Broker. They are read from the live Agent Hub, so the list stays in sync with the home page.

Passwords are not stored. Personal data is not stored or sold. The extension uses only the session cookie on enesmarealty.com.

## Category

Productivity

## Single purpose

Let an ENESMA Realty agent sign in with their existing Agent Hub account and open the Hub home-page tools in a new tab.

## Permission justification: cookies

Read and write the enesma_sso session cookie on enesmarealty.com so the popup uses the same sign-in as the Agent Hub website, Transaction Center, and E-Sign. If the agent checks Trust this device, the extension also sets enesma_dt, the same 30-day device cookie the website already sets. No other cookies are read.

## Permission justification: host permissions

https://script.google.com/* and https://script.googleusercontent.com/* are the existing Agent Hub sign-in service. https://*.enesmarealty.com/* and https://enesmarealty.com/* load the public tile list and images from agent.enesmarealty.com and set the session cookie on .enesmarealty.com. The extension does not read page contents, Gmail, or Google Drive.

## Privacy practices

Declare authentication information. Email and password are sent to the existing ENESMA sign-in service and are not stored by the extension. Data is not sold. Do not declare web history, website content, location, or financial information.

Remote code: No.

## Visibility

Public. Anyone can find and install it. Sign-in still requires an ENESMA Agent Hub account, and no tiles are shown until that sign-in succeeds.
