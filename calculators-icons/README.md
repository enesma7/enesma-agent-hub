# Calculators home-screen icon

These files are for **enesma7/enesma-calculators**. This workspace can read that repo and cannot push to it (`push: false`), so they are not on the calculators site yet.

The calculators site currently has no icon tags in its pages. iPhone still picks up `/apple-touch-icon.png` by convention, and that file is the same gold E on black as the Agent Hub. Replacing it, and adding the tags below, gives Calculators its own calculator mark and the home-screen name **Calculators**.

Do **not** replace anything under `hub/` in that repo. `hub/index.html` and `hub/manifest.webmanifest` are the Agent Hub install landing and must keep the E emblem.

## Copy these files to the calculators repo root

| File in this folder | Path in enesma-calculators |
|---|---|
| `apple-touch-icon.png` | `/apple-touch-icon.png` (replace) |
| `apple-touch-icon-precomposed.png` | `/apple-touch-icon-precomposed.png` (replace) |
| `favicon-32.png` | `/favicon-32.png` (new) |
| `favicon-16.png` | `/favicon-16.png` (new) |
| `icon-192.png` | `/icon-192.png` (new) |
| `icon-512.png` | `/icon-512.png` (new) |
| `icon-maskable-192.png` | `/icon-maskable-192.png` (new) |
| `icon-maskable-512.png` | `/icon-maskable-512.png` (new) |
| `manifest.webmanifest` | `/manifest.webmanifest` (new file at the root) |

## Add this block to each calculator page

Paste it immediately after the viewport meta tag. Add it to:

- `index.html`
- `flip-calculator.html`
- `net-sheet.html`
- `mortgage-calculator.html`
- `cap-rate-calculator.html`
- `join-calculator.html`

```html
<meta name="theme-color" content="#000007">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Calculators">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

On a phone, the Hub icon stays the gold E with the name Agent Hub. The calculators icon is a gold calculator on black with the name Calculators.
