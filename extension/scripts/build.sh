#!/usr/bin/env bash
# Build the Chrome Web Store zip. The manifest sits at the root of the archive.
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/write-fallback.mjs
rm -rf dist
mkdir -p dist
zip -r dist/enesma-agent-hub.zip \
  manifest.json \
  popup.html \
  popup.css \
  popup.js \
  hub.js \
  view.js \
  icons \
  assets \
  fallback \
  -x '*.DS_Store' -x '*/.DS_Store'
echo "Wrote dist/enesma-agent-hub.zip"
unzip -l dist/enesma-agent-hub.zip
