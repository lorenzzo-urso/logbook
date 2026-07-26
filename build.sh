#!/bin/sh
# Transpila o JSX e regenera o feed. Sem bundler, sem node_modules:
# React vem de vendor/ (UMD de produção), esbuild só converte JSX -> JS.
set -e
cd "$(dirname "$0")"
npx --yes esbuild@0.25.10 src/app.jsx --loader:.jsx=jsx --jsx-factory=React.createElement \
  --jsx-fragment=React.Fragment --minify --outfile=app.js --log-level=warning
python3 tools/validate_data.py
python3 tools/build_posts.py
python3 tools/build_search.py
python3 tools/gen_feed.py
echo "ok: app.js ($(wc -c < app.js | tr -d ' ') bytes) + posts.json + search.json + feed.xml"
